import { useState } from 'react';
import type { PedidoFilho } from '../types';
import { Modal } from './Modal';
import { tonCurto } from '../lib/format';

interface Props {
  ordem: PedidoFilho;
  onClose: () => void;
  onEnviar: (quantidade: number, justificativa: string) => void;
}

export function CorrigirOrdemModal({ ordem, onClose, onEnviar }: Props) {
  const fiscal = ordem.status === 'REJEITADO_FISCAL';
  const [quantidade, setQuantidade] = useState(String(fiscal ? ordem.quantidade_ordem_ton : ordem.quantidade_programada_ton));
  const [justificativa, setJustificativa] = useState('');

  const qtd = Number(quantidade.replace(',', '.'));
  const restante = qtd - ordem.quantidade_programada_ton;

  return (
    <Modal
      titulo={`Corrigir ${ordem.numero_ordem}`}
      onClose={onClose}
      onSubmit={() => {
        onEnviar(qtd, justificativa.trim());
        onClose();
      }}
      rodape={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!(qtd > 0) || !justificativa.trim()}>Reenviar para conferência</button>
        </>
      }
    >
      <div className="notice notice-err">
        <strong>Motivo da retenção</strong>
        {ordem.motivo_rejeicao}
      </div>

      {fiscal && (
        <p className="secondary" style={{ marginBottom: 16 }}>
          O cadastro fiscal é regularizado pelo cliente. Reenvie a ordem somente após a confirmação da regularização.
        </p>
      )}

      <div className="field">
        <label className="label" htmlFor="k-qtd">Quantidade da ordem (t)</label>
        <input id="k-qtd" className="input" inputMode="decimal" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
        {qtd > 0 && (
          <div className={`hint ${restante === 0 ? 'ok' : 'err'}`}>
            {restante === 0
              ? `Corresponde à quantidade programada (${tonCurto(ordem.quantidade_programada_ton)}).`
              : `Ainda difere da programada (${tonCurto(ordem.quantidade_programada_ton)}).`}
          </div>
        )}
      </div>

      <div className="field">
        <label className="label" htmlFor="k-just">O que foi corrigido</label>
        <textarea id="k-just" className="textarea" rows={3} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} required />
      </div>
    </Modal>
  );
}
