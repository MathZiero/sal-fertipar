export type PerfilUsuario = 'ADMIN' | 'LOGISTICA' | 'COMERCIAL';

export interface UsuarioSessao {
  id: string;
  email: string;
  nome: string;
  perfil: PerfilUsuario;
}

export type StatusPedidoFilho =
  | 'PENDENTE_CONFERENCIA'
  | 'LIBERADO'
  | 'REJEITADO_DIVERGENCIA'
  | 'REJEITADO_FISCAL'
  | 'EM_RESSUBMISSAO';

export type StatusSintegra = 'NAO_VALIDADO' | 'REGULAR' | 'IRREGULAR' | 'EM_ANALISE' | 'FALHA_CONSULTA';

export interface PedidoMae {
  id: string;
  numero_contrato: string;
  cliente_nome: string;
  cliente_cnpj: string;
  cliente_ie: string;
  cliente_uf: string;
  produto: string;
  quantidade_total_ton: number;
  quantidade_retirada_ton: number;
  quantidade_saldo_ton: number;
  status: 'ATIVO' | 'CONCLUIDO' | 'CANCELADO';
  created_at: string;
}

export interface PedidoFilho {
  id: string;
  numero_ordem: string;
  pedido_mae_id: string;
  pedido_mae_numero: string;
  cliente_nome: string;
  cliente_cnpj: string;
  cliente_ie: string;
  cliente_uf: string;
  motorista_nome: string;
  motorista_cpf: string;
  placa_veiculo: string;
  transportadora: string;
  produto: string;
  quantidade_programada_ton: number;
  quantidade_ordem_ton: number;
  divergencia_ton: number;
  status: StatusPedidoFilho;
  sintegra_status: StatusSintegra;
  sintegra_detalhes?: string;
  sintegra_tempo_ms?: number;
  motivo_rejeicao?: string;
  justificativa_ressubmissao?: string;
  created_at: string;
  updated_at: string;
  liberado_em?: string;
  liberado_por?: string;
  historico?: HistoricoEvento[];
}

export interface HistoricoEvento {
  id: string;
  data_hora: string;
  autor_perfil: PerfilUsuario;
  acao: string;
  detalhes: string;
}

export interface NotificacaoAlerta {
  id: string;
  tipo: 'DIVERGENCIA_PESO' | 'SINTEGRA_IRREGULAR' | 'RESSUBMISSAO' | 'LIBERADO' | 'INFO';
  titulo: string;
  mensagem: string;
  pedido_filho_id?: string;
  numero_ordem?: string;
  destinatario: 'TODOS' | 'LOGISTICA' | 'COMERCIAL';
  lida: boolean;
  created_at: string;
}

export interface InscricaoEstadualDetalhe {
  inscricao_estadual: string;
  ativo: boolean;
  uf: string;
  atualizado_em?: string;
}

export type SituacaoConsulta = 'REGULAR' | 'IRREGULAR' | 'INDETERMINADO';

export interface ResultadoConsultaSintegra {
  /** REGULAR e IRREGULAR são conclusivos. INDETERMINADO = não foi possível confirmar (nunca libera carga). */
  status: SituacaoConsulta;
  cnpj: string;
  razao_social: string;
  situacao_cadastral: string;
  inscricao_estadual: string;
  ie_ativa: boolean;
  uf: string;
  cidade: string;
  todas_inscricoes: InscricaoEstadualDetalhe[];
  tempo_resposta_ms: number;
  dentro_limite_5s: boolean;
  mensagem: string;
  origem: 'API' | 'CACHE';
}

export interface IndicadoresOperacionais {
  caminhoesLiberados: number;
  divergenciasEvitadas: number;
  bloqueiosFiscaisEvitados: number;
  tempoMedioValidacaoSegundos: number;
  toneladasLiberadas: number;
  pedidosPendentes: number;
  pedidosRessubmetidos: number;
}
