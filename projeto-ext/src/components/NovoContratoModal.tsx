import { useState } from 'react';
import type { PedidoMae } from '../types';
import { Modal } from './Modal';
import { consultarSintegraCnpjWs, limparCNPJ } from '../services/cnpjService';

const PRODUTOS = [
  'NPK 04-14-08',
  'NPK 20-00-20',
  'Ureia 46%',
  'Cloreto de Potássio (KCl)',
  'Superfosfato Simples (SSP)',
  'Fosfato Monoamônico (MAP)',
];

interface Props {
  proximoNumero: string;
  usuarioEmail: string;
  onClose: () => void;
  onCriar: (dados: Omit<PedidoMae, 'id' | 'created_at' | 'quantidade_saldo_ton'>) => void;
}

export function NovoContratoModal({ proximoNumero, usuarioEmail, onClose, onCriar }: Props) {
  const [numero, setNumero] = useState(proximoNumero);
  const [cnpj, setCnpj] = useState('');
  const [nome, setNome] = useState('');
  const [ie, setIe] = useState('');
  const [uf, setUf] = useState('');
  const [produto, setProduto] = useState(PRODUTOS[0]);
  const [volume, setVolume] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'err'; texto: string } | null>(null);

  async function preencherPeloCnpj() {
    if (limparCNPJ(cnpj).length !== 14) {
      setAviso({ tom: 'err', texto: 'Informe os 14 dígitos do CNPJ.' });
      return;
    }
    setBuscando(true);
    setAviso(null);
    const r = await consultarSintegraCnpjWs(cnpj, '', '', usuarioEmail);
    if (r.status === 'INDETERMINADO') {
      setAviso({ tom: 'err', texto: r.mensagem });
    } else {
      setNome(r.razao_social);
      setIe(r.inscricao_estadual);
      setUf(r.uf);
      setCnpj(r.cnpj);
      setAviso({ tom: r.status === 'REGULAR' ? 'ok' : 'err', texto: r.status === 'REGULAR' ? 'Dados preenchidos. Cadastro regular.' : r.mensagem });
    }
    setBuscando(false);
  }

  const volumeNum = Number(volume.replace(',', '.'));

  return (
    <Modal
      titulo="Novo contrato"
      onClose={onClose}
      onSubmit={() => {
        onCriar({
          numero_contrato: numero.trim(),
          cliente_nome: nome.trim(),
          cliente_cnpj: cnpj.trim(),
          cliente_ie: ie.trim(),
          cliente_uf: uf.trim().toUpperCase(),
          produto,
          quantidade_total_ton: volumeNum,
          quantidade_retirada_ton: 0,
          status: 'ATIVO',
        });
        onClose();
      }}
      rodape={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" disabled={!(volumeNum > 0)}>Criar contrato</button>
        </>
      }
    >
      <div className="field">
        <label className="label" htmlFor="c-cnpj">CNPJ do cliente</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="c-cnpj" className="input mono" placeholder="00.000.000/0000-00" value={cnpj} onChange={(e) => setCnpj(e.target.value)} required />
          <button type="button" className="btn" onClick={preencherPeloCnpj} disabled={buscando}>
            {buscando ? <span className="spinner" /> : 'Buscar dados'}
          </button>
        </div>
        {aviso && <div className={`hint ${aviso.tom}`}>{aviso.texto}</div>}
      </div>

      <div className="field">
        <label className="label" htmlFor="c-nome">Razão social</label>
        <input id="c-nome" className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="c-ie">Inscrição estadual</label>
          <input id="c-ie" className="input mono" value={ie} onChange={(e) => setIe(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="c-uf">UF</label>
          <input id="c-uf" className="input" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} required />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="c-num">Nº do contrato</label>
          <input id="c-num" className="input mono" value={numero} onChange={(e) => setNumero(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="c-vol">Volume total (t)</label>
          <input id="c-vol" className="input" inputMode="decimal" value={volume} onChange={(e) => setVolume(e.target.value)} required />
        </div>
      </div>

      <div className="field">
        <label className="label" htmlFor="c-prod">Produto</label>
        <select id="c-prod" className="select" value={produto} onChange={(e) => setProduto(e.target.value)}>
          {PRODUTOS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
    </Modal>
  );
}
