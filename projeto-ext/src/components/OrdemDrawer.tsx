import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { PedidoFilho } from '../types';
import { dataCompleta, situacaoOrdem, ton } from '../lib/format';

interface Props {
  ordem: PedidoFilho;
  onClose: () => void;
  acoes?: ReactNode;
}

const FISCAL: Record<PedidoFilho['sintegra_status'], string> = {
  NAO_VALIDADO: 'Ainda não conferido',
  REGULAR: 'Regular',
  IRREGULAR: 'Irregular',
  EM_ANALISE: 'Em análise',
  FALHA_CONSULTA: 'Não confirmado (consulta sem retorno)',
};

export function OrdemDrawer({ ordem, onClose, acoes }: Props) {
  const sit = situacaoOrdem(ordem);
  const divergente = ordem.divergencia_ton !== 0;
  const historico = [...(ordem.historico ?? [])].reverse();

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`Ordem ${ordem.numero_ordem}`}>
        <header className="drawer-head">
          <div>
            <h2>{ordem.numero_ordem}</h2>
            <span className={`badge badge-${sit.tom}`} style={{ marginTop: 8 }}>{sit.label}</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="drawer-body">
          {ordem.motivo_rejeicao && (ordem.status === 'REJEITADO_DIVERGENCIA' || ordem.status === 'REJEITADO_FISCAL') && (
            <div className="notice notice-err">
              <strong>Ordem retida</strong>
              {ordem.motivo_rejeicao}
            </div>
          )}
          {ordem.sintegra_status === 'FALHA_CONSULTA' && (ordem.status === 'PENDENTE_CONFERENCIA' || ordem.status === 'EM_RESSUBMISSAO') && (
            <div className="notice notice-warn">
              <strong>Cadastro fiscal não confirmado</strong>
              {ordem.sintegra_detalhes} Tente conferir novamente.
            </div>
          )}
          {ordem.status === 'EM_RESSUBMISSAO' && ordem.justificativa_ressubmissao && (
            <div className="notice notice-info">
              <strong>Correção do comercial</strong>
              {ordem.justificativa_ressubmissao}
            </div>
          )}

          <h3 className="section-title">Carga</h3>
          <dl className="kv">
            <dt>Cliente</dt><dd>{ordem.cliente_nome}</dd>
            <dt>CNPJ</dt><dd className="mono">{ordem.cliente_cnpj}</dd>
            <dt>Contrato</dt><dd>{ordem.pedido_mae_numero}</dd>
            <dt>Produto</dt><dd>{ordem.produto}</dd>
            <dt>Programada</dt><dd className="num">{ton(ordem.quantidade_programada_ton)}</dd>
            <dt>Ordem emitida</dt>
            <dd className="num">
              {ton(ordem.quantidade_ordem_ton)}
              {divergente && <span className="delta"> ({ordem.divergencia_ton > 0 ? '+' : ''}{ordem.divergencia_ton.toLocaleString('pt-BR')} t)</span>}
            </dd>
            <dt>Cadastro fiscal</dt><dd>{FISCAL[ordem.sintegra_status]}</dd>
          </dl>

          <h3 className="section-title">Transporte</h3>
          <dl className="kv">
            <dt>Veículo</dt><dd className="mono">{ordem.placa_veiculo}</dd>
            <dt>Motorista</dt><dd>{ordem.motorista_nome}</dd>
            <dt>CPF</dt><dd className="mono">{ordem.motorista_cpf}</dd>
            <dt>Transportadora</dt><dd>{ordem.transportadora}</dd>
          </dl>

          <h3 className="section-title">Histórico</h3>
          {historico.length === 0 ? (
            <p className="secondary">Nenhum registro.</p>
          ) : (
            <ul className="timeline">
              {historico.map((h) => (
                <li key={h.id}>
                  <div className="primary">{h.acao}</div>
                  <div className="secondary">{h.detalhes}</div>
                  <div className="when">{dataCompleta(h.data_hora)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {acoes && <footer className="drawer-foot">{acoes}</footer>}
      </aside>
    </>
  );
}
