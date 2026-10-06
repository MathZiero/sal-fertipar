import type { InscricaoEstadualDetalhe, ResultadoConsultaSintegra } from '../types';
import { registrar } from './observability';

// Cache em memória: a API pública limita a 3 consultas/minuto.
const cache = new Map<string, { data: ResultadoConsultaSintegra; ts: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;
const LIMITE_MS = 5000;

export function limparCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '');
}

export function formatarCNPJ(cnpj: string): string {
  return limparCNPJ(cnpj)
    .padStart(14, '0')
    .slice(-14)
    .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function indeterminado(cnpj: string, ie: string, uf: string, ms: number, mensagem: string): ResultadoConsultaSintegra {
  return {
    status: 'INDETERMINADO',
    cnpj: formatarCNPJ(cnpj),
    razao_social: '',
    situacao_cadastral: 'Não confirmada',
    inscricao_estadual: ie,
    ie_ativa: false,
    uf,
    cidade: '',
    todas_inscricoes: [],
    tempo_resposta_ms: ms,
    dentro_limite_5s: ms <= LIMITE_MS,
    mensagem,
    origem: 'API',
  };
}

/**
 * Consulta a situação cadastral e a Inscrição Estadual do cliente (limite de 5 segundos).
 * Quando não é possível confirmar, retorna INDETERMINADO: o sistema nunca assume regularidade.
 */
export async function consultarSintegraCnpjWs(
  cnpjInput: string,
  ieEsperada = '',
  ufEsperada = '',
  usuario?: string
): Promise<ResultadoConsultaSintegra> {
  const cnpj = limparCNPJ(cnpjInput);
  const inicio = performance.now();
  const decorrido = () => Math.round(performance.now() - inicio);

  if (cnpj.length !== 14) {
    return indeterminado(cnpj, ieEsperada, ufEsperada, 0, 'CNPJ inválido: informe os 14 dígitos.');
  }

  const emCache = cache.get(cnpj);
  if (emCache && Date.now() - emCache.ts < CACHE_TTL_MS) {
    const ms = decorrido();
    registrar('info', 'consulta', `Consulta ${formatarCNPJ(cnpj)} atendida pelo cache`, { usuario, duracao_ms: ms });
    return { ...emCache.data, origem: 'CACHE', tempo_resposta_ms: ms, dentro_limite_5s: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LIMITE_MS);

  let resposta: Response | null = null;
  let erro = '';
  for (const url of [`/api/cnpj-proxy/${cnpj}`, `https://publica.cnpj.ws/cnpj/${cnpj}`]) {
    try {
      const r = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      if (r.ok) {
        resposta = r;
        break;
      }
      if (r.status === 404) {
        erro = 'CNPJ não localizado na base cadastral.';
        break;
      }
      if (r.status === 429) {
        erro = 'Limite de consultas atingido. Aguarde um minuto e tente novamente.';
        break;
      }
      erro = `Serviço de consulta indisponível (HTTP ${r.status}).`;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        erro = 'Tempo limite de 5 segundos excedido.';
        break;
      }
      erro = 'Falha de comunicação com o serviço de consulta.';
    }
  }
  clearTimeout(timer);

  if (!resposta) {
    const ms = decorrido();
    registrar('error', 'consulta', `Consulta ${formatarCNPJ(cnpj)} falhou: ${erro}`, { usuario, duracao_ms: ms });
    return indeterminado(cnpj, ieEsperada, ufEsperada, ms, erro);
  }

  try {
    const data = await resposta.json();
    const est = data.estabelecimento ?? {};
    const situacao: string = est.situacao_cadastral ?? 'Desconhecida';
    const ativa = situacao.toLowerCase() === 'ativa';
    const uf: string = est.estado?.sigla ?? ufEsperada;

    const ies: InscricaoEstadualDetalhe[] = (est.inscricoes_estaduais ?? []).map(
      (i: { inscricao_estadual: string; ativo: boolean; estado?: { sigla?: string }; atualizado_em?: string }) => ({
        inscricao_estadual: i.inscricao_estadual,
        ativo: Boolean(i.ativo),
        uf: i.estado?.sigla ?? uf,
        atualizado_em: i.atualizado_em,
      })
    );

    // Procura a IE do contrato; na ausência, a IE da UF do cliente.
    const alvo = ieEsperada.replace(/\D/g, '');
    const ie =
      (alvo && ies.find((i) => i.inscricao_estadual.replace(/\D/g, '') === alvo)) ||
      ies.find((i) => i.uf.toUpperCase() === (ufEsperada || uf).toUpperCase()) ||
      ies[0];

    const ieAtiva = ie ? ie.ativo : ativa;
    const regular = ativa && ieAtiva;
    const ms = decorrido();

    const resultado: ResultadoConsultaSintegra = {
      status: regular ? 'REGULAR' : 'IRREGULAR',
      cnpj: formatarCNPJ(cnpj),
      razao_social: data.razao_social ?? '',
      situacao_cadastral: situacao,
      inscricao_estadual: ie?.inscricao_estadual ?? ieEsperada,
      ie_ativa: ieAtiva,
      uf,
      cidade: est.cidade?.nome ?? '',
      todas_inscricoes: ies,
      tempo_resposta_ms: ms,
      dentro_limite_5s: ms <= LIMITE_MS,
      mensagem: regular
        ? `Cadastro regular (${uf}).`
        : `Cadastro irregular: situação ${situacao}, inscrição estadual ${ieAtiva ? 'ativa' : 'inativa'}.`,
      origem: 'API',
    };

    cache.set(cnpj, { data: resultado, ts: Date.now() });
    registrar(
      regular ? 'info' : 'warn',
      'consulta',
      `Consulta ${formatarCNPJ(cnpj)}: ${regular ? 'regular' : 'irregular'}`,
      { usuario, duracao_ms: ms }
    );
    return resultado;
  } catch {
    const ms = decorrido();
    registrar('error', 'consulta', `Consulta ${formatarCNPJ(cnpj)}: resposta inválida do serviço`, { usuario, duracao_ms: ms });
    return indeterminado(cnpj, ieEsperada, ufEsperada, ms, 'Resposta inválida do serviço de consulta.');
  }
}
