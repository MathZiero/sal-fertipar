import { useState } from 'react';
import type { PedidoFilho, PedidoMae } from '../types';
import { Modal } from './Modal';
import { tonCurto } from '../lib/format';

type Dados = Omit<PedidoFilho, 'id' | 'created_at' | 'updated_at' | 'divergencia_ton' | 'status' | 'sintegra_status' | 'historico'>;

interface Props {
  contratos: PedidoMae[];
  contratoInicial?: PedidoMae;
  onClose: () => void;
  onCriar: (dados: Dados) => void;
}

export function NovaOrdemModal({ contratos, contratoInicial, onClose, onCriar }: Props) {
  const ativos = contratos.filter((c) => c.status === 'ATIVO');
  const [contratoId, setContratoId] = useState(contratoInicial?.id ?? ativos[0]?.id ?? '');
  const [placa, setPlaca] = useState('');
  const [motorista, setMotorista] = useState('');
  const [cpf, setCpf] = useState('');
  const [transportadora, setTransportadora] = useState('');
  const [programada, setProgramada] = useState('');
  const [ordem, setOrdem] = useState('');

  const contrato = contratos.find((c) => c.id === contratoId);
  const prog = Number(programada.replace(',', '.'));
  const emit = Number(ordem.replace(',', '.'));
  const divergente = prog > 0 && emit > 0 && prog !== emit;
  const excede = contrato && emit > contrato.quantidade_saldo_ton;

  return (
    <Modal
      titulo="Nova ordem de carregamento"
      onClose={onClose}
      onSubmit={() => {
        if (!contrato) return;
        onCriar({
          numero_ordem: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          pedido_mae_id: contrato.id,
          pedido_mae_numero: contrato.numero_contrato,
          cliente_nome: contrato.cliente_nome,
          cliente_cnpj: contrato.cliente_cnpj,
          cliente_ie: contrato.cliente_ie,
          cliente_uf: contrato.cliente_uf,
          produto: contrato.produto,
          motorista_nome: motorista.trim(),
          motorista_cpf: cpf.trim(),
          placa_veiculo: placa.trim().toUpperCase(),
          transportadora: transportadora.trim(),
          quantidade_programada_ton: prog,
          quantidade_ordem_ton: emit,
        });
        onClose();
      }}
      rodape={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!contrato || !(prog > 0) || !(emit > 0)}>Emitir ordem</button>
        </>
      }
    >
      <div className="field">
        <label className="label" htmlFor="o-contrato">Contrato</label>
        <select id="o-contrato" className="select" value={contratoId} onChange={(e) => setContratoId(e.target.value)} required>
          {ativos.map((c) => (
            <option key={c.id} value={c.id}>{c.numero_contrato} · {c.cliente_nome}</option>
          ))}
        </select>
        {contrato && (
          <div className="hint">{contrato.produto} · saldo disponível {tonCurto(contrato.quantidade_saldo_ton)}</div>
        )}
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="o-placa">Placa</label>
          <input id="o-placa" className="input mono" placeholder="ABC-1D23" value={placa} onChange={(e) => setPlaca(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="o-transp">Transportadora</label>
          <input id="o-transp" className="input" value={transportadora} onChange={(e) => setTransportadora(e.target.value)} required />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="o-mot">Motorista</label>
          <input id="o-mot" className="input" value={motorista} onChange={(e) => setMotorista(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="o-cpf">CPF do motorista</label>
          <input id="o-cpf" className="input mono" value={cpf} onChange={(e) => setCpf(e.target.value)} required />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="o-prog">Quantidade programada (t)</label>
          <input id="o-prog" className="input" inputMode="decimal" value={programada} onChange={(e) => setProgramada(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="o-ord">Quantidade da ordem (t)</label>
          <input id="o-ord" className="input" inputMode="decimal" value={ordem} onChange={(e) => setOrdem(e.target.value)} required />
        </div>
      </div>

      {divergente && (
        <div className="notice notice-warn">
          <strong>Quantidades diferentes</strong>
          A ordem será retida na conferência da logística.
        </div>
      )}
      {excede && (
        <div className="notice notice-err">
          <strong>Saldo insuficiente</strong>
          A quantidade excede o saldo disponível do contrato.
        </div>
      )}
    </Modal>
  );
}
