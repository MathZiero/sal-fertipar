import type { PedidoFilho } from '../types';

export const ton = (n: number) =>
  `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} t`;

export const tonCurto = (n: number) =>
  `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} t`;

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export const dataCompleta = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

export type Tom = 'ok' | 'warn' | 'err' | 'info' | 'neutral';

export function situacaoOrdem(p: PedidoFilho): { label: string; tom: Tom } {
  const emEspera = p.status === 'PENDENTE_CONFERENCIA' || p.status === 'EM_RESSUBMISSAO';
  if (emEspera && p.sintegra_status === 'FALHA_CONSULTA') return { label: 'Cadastro não confirmado', tom: 'warn' };
  switch (p.status) {
    case 'LIBERADO':
      return { label: 'Liberada', tom: 'ok' };
    case 'REJEITADO_DIVERGENCIA':
      return { label: p.motivo_rejeicao?.startsWith('Saldo') ? 'Saldo insuficiente' : 'Divergência de peso', tom: 'err' };
    case 'REJEITADO_FISCAL':
      return { label: 'Cadastro irregular', tom: 'err' };
    case 'EM_RESSUBMISSAO':
      return { label: 'Reenviada', tom: 'info' };
    default:
      return { label: 'Aguardando conferência', tom: 'warn' };
  }
}

export const retida = (p: PedidoFilho) => p.status === 'REJEITADO_DIVERGENCIA' || p.status === 'REJEITADO_FISCAL';
export const aguardando = (p: PedidoFilho) => p.status === 'PENDENTE_CONFERENCIA' || p.status === 'EM_RESSUBMISSAO';

export const PERFIL_LABEL = { ADMIN: 'Administrador', LOGISTICA: 'Logística', COMERCIAL: 'Comercial' } as const;
