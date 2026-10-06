import type {
  PedidoMae,
  PedidoFilho,
  NotificacaoAlerta,
  ResultadoConsultaSintegra,
  IndicadoresOperacionais,
} from '../types';
import {
  INITIAL_PEDIDOS_MAE,
  INITIAL_PEDIDOS_FILHO,
  INITIAL_NOTIFICACOES,
} from '../data/seedData';
import { supabase } from './supabaseClient';
import { registrar } from './observability';

const STORAGE_KEY_MAE = 'fertipar_pedidos_mae_v1';
const STORAGE_KEY_FILHO = 'fertipar_pedidos_filho_v1';
const STORAGE_KEY_NOTIF = 'fertipar_notificacoes_v1';

class DataService {
  private pedidosMae: PedidoMae[] = [];
  private pedidosFilho: PedidoFilho[] = [];
  private notificacoes: NotificacaoAlerta[] = [];
  private listeners: (() => void)[] = [];
  private supabaseSyncEnabled = false;

  constructor() {
    this.carregarDadosIniciais();
  }

  private carregarDadosIniciais() {
    try {
      const savedMae = localStorage.getItem(STORAGE_KEY_MAE);
      const savedFilho = localStorage.getItem(STORAGE_KEY_FILHO);
      const savedNotif = localStorage.getItem(STORAGE_KEY_NOTIF);

      this.pedidosMae = savedMae ? JSON.parse(savedMae) : [...INITIAL_PEDIDOS_MAE];
      this.pedidosFilho = savedFilho ? JSON.parse(savedFilho) : [...INITIAL_PEDIDOS_FILHO];
      this.notificacoes = savedNotif ? JSON.parse(savedNotif) : [...INITIAL_NOTIFICACOES];
    } catch {
      this.pedidosMae = [...INITIAL_PEDIDOS_MAE];
      this.pedidosFilho = [...INITIAL_PEDIDOS_FILHO];
      this.notificacoes = [...INITIAL_NOTIFICACOES];
    }
  }

  private persistirLocal() {
    try {
      localStorage.setItem(STORAGE_KEY_MAE, JSON.stringify(this.pedidosMae));
      localStorage.setItem(STORAGE_KEY_FILHO, JSON.stringify(this.pedidosFilho));
      localStorage.setItem(STORAGE_KEY_NOTIF, JSON.stringify(this.notificacoes));
    } catch (e) {
      console.warn('Erro ao salvar localmente no navegador:', e);
    }
    this.notificarListeners();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notificarListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Erro no listener de dados:', err);
      }
    });
  }

  public getPedidosMae(): PedidoMae[] {
    return [...this.pedidosMae];
  }

  public getPedidosFilho(): PedidoFilho[] {
    return [...this.pedidosFilho];
  }

  public getNotificacoes(): NotificacaoAlerta[] {
    return [...this.notificacoes];
  }

  public getPedidoMaePorId(id: string): PedidoMae | undefined {
    return this.pedidosMae.find((p) => p.id === id);
  }

  public getPedidoFilhoPorId(id: string): PedidoFilho | undefined {
    return this.pedidosFilho.find((p) => p.id === id);
  }

  public criarPedidoMae(novo: Omit<PedidoMae, 'id' | 'created_at' | 'quantidade_saldo_ton'>): PedidoMae {
    const pedido: PedidoMae = {
      ...novo,
      id: `mae-${Date.now().toString(36)}`,
      quantidade_saldo_ton: novo.quantidade_total_ton - (novo.quantidade_retirada_ton || 0),
      created_at: new Date().toISOString(),
    };

    this.pedidosMae.unshift(pedido);
    this.persistirLocal();
    this.tentarSyncSupabase('pedidos_mae', pedido);
    return pedido;
  }

  public criarPedidoFilho(
    dados: Omit<
      PedidoFilho,
      | 'id'
      | 'created_at'
      | 'updated_at'
      | 'divergencia_ton'
      | 'status'
      | 'sintegra_status'
      | 'historico'
    >
  ): PedidoFilho {
    const divergencia = Number((dados.quantidade_ordem_ton - dados.quantidade_programada_ton).toFixed(2));
    const agora = new Date().toISOString();

    const novoFilho: PedidoFilho = {
      ...dados,
      id: `filho-${Date.now().toString(36)}`,
      divergencia_ton: divergencia,
      status: 'PENDENTE_CONFERENCIA',
      sintegra_status: 'NAO_VALIDADO',
      created_at: agora,
      updated_at: agora,
      historico: [
        {
          id: `h-${Date.now()}`,
          data_hora: agora,
          autor_perfil: 'COMERCIAL',
          acao: 'ORDEM EMITIDA',
          detalhes: `Ordem criada com ${dados.quantidade_ordem_ton}t para caminhão placa ${dados.placa_veiculo}.`,
        },
      ],
    };

    this.pedidosFilho.unshift(novoFilho);

    // Se já foi criado com divergência de quantidade, emite alerta imediato
    if (divergencia !== 0) {
      this.criarNotificacao({
        tipo: 'DIVERGENCIA_PESO',
        titulo: `Divergência Emitida: ${novoFilho.numero_ordem}`,
        mensagem: `Atenção: Ordem emitida (${novoFilho.quantidade_ordem_ton}t) difere da programada (${novoFilho.quantidade_programada_ton}t) para ${novoFilho.cliente_nome}.`,
        pedido_filho_id: novoFilho.id,
        numero_ordem: novoFilho.numero_ordem,
        destinatario: 'TODOS',
      });
    }

    this.persistirLocal();
    this.tentarSyncSupabase('pedidos_filho', novoFilho);
    return novoFilho;
  }

  /**
   * Realiza a validação e conferência do carregamento físico pela Logística
   * Conforme os critérios do Briefing:
   * 1. Correspondência de tonelagem entre Pedido-Mãe e Ordem
   * 2. Regularidade cadastral Sintegra (SEFAZ)
   */
  public conferirELiberar(
    pedidoFilhoId: string,
    sintegra: ResultadoConsultaSintegra,
    operadorNome: string = 'Operador Logística'
  ): { sucesso: boolean; mensagem: string; pedido: PedidoFilho } {
    const pedido = this.pedidosFilho.find((p) => p.id === pedidoFilhoId);
    if (!pedido) {
      throw new Error('Pedido-Filho não encontrado');
    }

    const pedidoMae = this.pedidosMae.find((m) => m.id === pedido.pedido_mae_id);
    const agora = new Date().toISOString();
    const divergencia = Number((pedido.quantidade_ordem_ton - pedido.quantidade_programada_ton).toFixed(2));

    pedido.divergencia_ton = divergencia;
    pedido.sintegra_detalhes = sintegra.mensagem;
    pedido.sintegra_tempo_ms = sintegra.tempo_resposta_ms;
    pedido.updated_at = agora;

    // Regra 0: sem confirmação cadastral, a carga nunca é liberada (e a ordem não é marcada como irregular)
    if (sintegra.status === 'INDETERMINADO') {
      pedido.sintegra_status = 'FALHA_CONSULTA';
      pedido.historico = pedido.historico || [];
      pedido.historico.push({
        id: `h-${Date.now()}`,
        data_hora: agora,
        autor_perfil: 'LOGISTICA',
        acao: 'Consulta cadastral sem confirmação',
        detalhes: `${sintegra.mensagem} Conferido por ${operadorNome}.`,
      });
      registrar('warn', 'ordem', `${pedido.numero_ordem}: consulta cadastral sem confirmação`, { usuario: operadorNome });
      this.persistirLocal();
      return { sucesso: false, mensagem: sintegra.mensagem, pedido };
    }

    pedido.sintegra_status = sintegra.status === 'REGULAR' ? 'REGULAR' : 'IRREGULAR';

    // Regra 1: Validação Sintegra Fiscal
    if (sintegra.status === 'IRREGULAR') {
      registrar('warn', 'ordem', `${pedido.numero_ordem}: retida por cadastro fiscal irregular`, { usuario: operadorNome });
      pedido.status = 'REJEITADO_FISCAL';
      pedido.motivo_rejeicao = `Cadastro fiscal do cliente irregular na SEFAZ (${sintegra.uf}). Carregamento não autorizado até a regularização.`;

      pedido.historico = pedido.historico || [];
      pedido.historico.push({
        id: `h-${Date.now()}`,
        data_hora: agora,
        autor_perfil: 'LOGISTICA',
        acao: 'BLOQUEIO FISCAL SINTEGRA',
        detalhes: pedido.motivo_rejeicao,
      });

      this.criarNotificacao({
        tipo: 'SINTEGRA_IRREGULAR',
        titulo: `BLOQUEIO FISCAL: Ordem ${pedido.numero_ordem}`,
        mensagem: `Cliente ${pedido.cliente_nome} irregular no Sintegra. Carregamento impedido na portaria. Acionar Comercial para contato com cliente.`,
        pedido_filho_id: pedido.id,
        numero_ordem: pedido.numero_ordem,
        destinatario: 'TODOS',
      });

      this.persistirLocal();
      return {
        sucesso: false,
        mensagem: pedido.motivo_rejeicao,
        pedido,
      };
    }

    // Regra 2: Validação de Correspondência de Peso / Tonelagem
    if (divergencia !== 0) {
      pedido.status = 'REJEITADO_DIVERGENCIA';
      const diferencaTexto = divergencia > 0 ? `+${divergencia}t acima` : `${divergencia}t abaixo`;
      pedido.motivo_rejeicao = `Quantidade da ordem (${pedido.quantidade_ordem_ton} t) diferente da programada (${pedido.quantidade_programada_ton} t): ${diferencaTexto}.`;
      registrar('warn', 'ordem', `${pedido.numero_ordem}: retida por divergência de tonelagem (${divergencia} t)`, { usuario: operadorNome });

      pedido.historico = pedido.historico || [];
      pedido.historico.push({
        id: `h-${Date.now()}`,
        data_hora: agora,
        autor_perfil: 'LOGISTICA',
        acao: 'Retida por divergência de tonelagem',
        detalhes: pedido.motivo_rejeicao,
      });

      this.criarNotificacao({
        tipo: 'DIVERGENCIA_PESO',
        titulo: `Divergência de Peso: Ordem ${pedido.numero_ordem}`,
        mensagem: `Descasamento detectado na portaria para ${pedido.cliente_nome}. Ordem: ${pedido.quantidade_ordem_ton}t vs Programado: ${pedido.quantidade_programada_ton}t.`,
        pedido_filho_id: pedido.id,
        numero_ordem: pedido.numero_ordem,
        destinatario: 'TODOS',
      });

      this.persistirLocal();
      return {
        sucesso: false,
        mensagem: pedido.motivo_rejeicao,
        pedido,
      };
    }

    // Regra 3: Validação de Saldo Remanescente no Pedido-Mãe
    if (pedidoMae && pedidoMae.quantidade_saldo_ton < pedido.quantidade_ordem_ton) {
      pedido.status = 'REJEITADO_DIVERGENCIA';
      pedido.motivo_rejeicao = `Saldo insuficiente no contrato: disponível ${pedidoMae.quantidade_saldo_ton} t, solicitado ${pedido.quantidade_ordem_ton} t.`;

      pedido.historico = pedido.historico || [];
      pedido.historico.push({
        id: `h-${Date.now()}`,
        data_hora: agora,
        autor_perfil: 'LOGISTICA',
        acao: 'Retida por saldo insuficiente',
        detalhes: pedido.motivo_rejeicao,
      });

      this.criarNotificacao({
        tipo: 'DIVERGENCIA_PESO',
        titulo: `Saldo Insuficiente: ${pedido.numero_ordem}`,
        mensagem: `Contrato ${pedidoMae.numero_contrato} não possui saldo suficiente (${pedidoMae.quantidade_saldo_ton}t disponíveis).`,
        pedido_filho_id: pedido.id,
        numero_ordem: pedido.numero_ordem,
        destinatario: 'TODOS',
      });

      this.persistirLocal();
      return {
        sucesso: false,
        mensagem: pedido.motivo_rejeicao,
        pedido,
      };
    }

    // APROVAÇÃO: Todas as regras atendidas com sucesso!
    pedido.status = 'LIBERADO';
    pedido.liberado_em = agora;
    pedido.liberado_por = operadorNome;
    pedido.motivo_rejeicao = undefined;

    pedido.historico = pedido.historico || [];
    pedido.historico.push({
      id: `h-${Date.now()}`,
      data_hora: agora,
      autor_perfil: 'LOGISTICA',
      acao: 'Carregamento liberado',
      detalhes: `Cadastro fiscal regular e tonelagem conferida (${pedido.quantidade_ordem_ton} t). Liberado por ${operadorNome}.`,
    });
    registrar('info', 'ordem', `${pedido.numero_ordem}: carregamento liberado`, { usuario: operadorNome });

    // Abate o saldo no Pedido-Mãe correspondente
    if (pedidoMae) {
      pedidoMae.quantidade_retirada_ton = Number(
        (pedidoMae.quantidade_retirada_ton + pedido.quantidade_ordem_ton).toFixed(2)
      );
      pedidoMae.quantidade_saldo_ton = Number(
        (pedidoMae.quantidade_total_ton - pedidoMae.quantidade_retirada_ton).toFixed(2)
      );
      if (pedidoMae.quantidade_saldo_ton <= 0) {
        pedidoMae.status = 'CONCLUIDO';
      }
      this.tentarSyncSupabase('pedidos_mae', pedidoMae);
    }

    this.criarNotificacao({
      tipo: 'LIBERADO',
      titulo: `Carregamento Autorizado: ${pedido.numero_ordem}`,
      mensagem: `Veículo ${pedido.placa_veiculo} liberado para carregar ${pedido.quantidade_ordem_ton}t de ${pedido.produto} para ${pedido.cliente_nome}.`,
      pedido_filho_id: pedido.id,
      numero_ordem: pedido.numero_ordem,
      destinatario: 'TODOS',
    });

    this.persistirLocal();
    this.tentarSyncSupabase('pedidos_filho', pedido);

    return {
      sucesso: true,
      mensagem: `Ordem ${pedido.numero_ordem} liberada para carregamento.`,
      pedido,
    };
  }

  /**
   * Fluxo de Ressubmissão pelo Comercial (Funcionalidade D do Briefing)
   * Permite que o analista de vendas/comercial corrija a ordem emitida
   * e envie novamente para a fila da portaria/logística.
   */
  public ressubmeterPedidoFilho(
    pedidoFilhoId: string,
    novaQuantidadeOrdem: number,
    justificativa: string,
    usuarioNome: string = 'Analista Comercial'
  ): PedidoFilho {
    const pedido = this.pedidosFilho.find((p) => p.id === pedidoFilhoId);
    if (!pedido) {
      throw new Error('Pedido-Filho não encontrado');
    }

    const agora = new Date().toISOString();
    pedido.quantidade_ordem_ton = novaQuantidadeOrdem;
    pedido.divergencia_ton = Number(
      (novaQuantidadeOrdem - pedido.quantidade_programada_ton).toFixed(2)
    );
    pedido.status = 'EM_RESSUBMISSAO';
    pedido.justificativa_ressubmissao = justificativa;
    pedido.updated_at = agora;

    pedido.historico = pedido.historico || [];
    pedido.historico.push({
      id: `h-${Date.now()}`,
      data_hora: agora,
      autor_perfil: 'COMERCIAL',
      acao: 'RESSUBMISSÃO PARA LOGÍSTICA',
      detalhes: `Ordem reajustada para ${novaQuantidadeOrdem}t por ${usuarioNome}. Justificativa: "${justificativa}".`,
    });

    this.criarNotificacao({
      tipo: 'RESSUBMISSAO',
      titulo: `Ordem Ressubmetida: ${pedido.numero_ordem}`,
      mensagem: `Comercial ajustou a ordem de ${pedido.cliente_nome} para ${novaQuantidadeOrdem}t. Disponível na fila da Logística para nova conferência.`,
      pedido_filho_id: pedido.id,
      numero_ordem: pedido.numero_ordem,
      destinatario: 'LOGISTICA',
    });

    this.persistirLocal();
    this.tentarSyncSupabase('pedidos_filho', pedido);
    return pedido;
  }

  public criarNotificacao(
    dados: Omit<NotificacaoAlerta, 'id' | 'lida' | 'created_at'>
  ): NotificacaoAlerta {
    const notif: NotificacaoAlerta = {
      ...dados,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      lida: false,
      created_at: new Date().toISOString(),
    };
    this.notificacoes.unshift(notif);
    this.persistirLocal();
    return notif;
  }

  public marcarNotificacaoLida(id: string) {
    const notif = this.notificacoes.find((n) => n.id === id);
    if (notif) {
      notif.lida = true;
      this.persistirLocal();
    }
  }

  public marcarTodasNotificacoesLidas() {
    this.notificacoes.forEach((n) => (n.lida = true));
    this.persistirLocal();
  }

  public obterIndicadores(): IndicadoresOperacionais {
    const contar = (s: PedidoFilho['status']) => this.pedidosFilho.filter((p) => p.status === s).length;

    const tempos = this.pedidosFilho
      .map((p) => p.sintegra_tempo_ms)
      .filter((t): t is number => typeof t === 'number' && t > 0);
    const mediaMs = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;

    const toneladas = this.pedidosFilho
      .filter((p) => p.status === 'LIBERADO')
      .reduce((acc, p) => acc + p.quantidade_ordem_ton, 0);

    return {
      caminhoesLiberados: contar('LIBERADO'),
      divergenciasEvitadas: contar('REJEITADO_DIVERGENCIA'),
      bloqueiosFiscaisEvitados: contar('REJEITADO_FISCAL'),
      tempoMedioValidacaoSegundos: Number((mediaMs / 1000).toFixed(2)),
      toneladasLiberadas: Number(toneladas.toFixed(2)),
      pedidosPendentes: contar('PENDENTE_CONFERENCIA'),
      pedidosRessubmetidos: contar('EM_RESSUBMISSAO'),
    };
  }

  public redefinirParaDadosPadrao() {
    this.pedidosMae = [...INITIAL_PEDIDOS_MAE];
    this.pedidosFilho = [...INITIAL_PEDIDOS_FILHO];
    this.notificacoes = [...INITIAL_NOTIFICACOES];
    this.persistirLocal();
  }

  private async tentarSyncSupabase(tabela: string, dados: any) {
    if (!this.supabaseSyncEnabled) return;
    try {
      await supabase.from(tabela).upsert(dados);
    } catch {
      // Ignora erro silenciosamente para não prejudicar operação offline
    }
  }
}

export const dataService = new DataService();
