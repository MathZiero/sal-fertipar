import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { PedidoMae, UsuarioSessao } from '../types';
import { useDados } from '../services/useDados';
import { dataService } from '../services/dataService';
import { dataCurta, tonCurto } from '../lib/format';
import { useToast } from '../components/Toast';
import { NovoContratoModal } from '../components/NovoContratoModal';
import { NovaOrdemModal } from '../components/NovaOrdemModal';

export function Contratos({ usuario }: { usuario: UsuarioSessao }) {
  const { contratos } = useDados();
  const toast = useToast();
  const [busca, setBusca] = useState('');
  const [showNovoContrato, setShowNovoContrato] = useState(false);
  const [contratoParaOrdem, setContratoParaOrdem] = useState<PedidoMae | null>(null);

  const termo = busca.trim().toLowerCase();
  const lista = contratos.filter(
    (c) =>
      !termo ||
      [c.numero_contrato, c.cliente_nome, c.cliente_cnpj, c.produto].some((v) =>
        v.toLowerCase().includes(termo)
      )
  );

  const proximoNumero = `CTR-${new Date().getFullYear()}/${String(contratos.length + 401).padStart(4, '0')}`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Contratos</h1>
          <p>Gestão de volumes contratados e saldos disponíveis por cliente.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowNovoContrato(true)}>
            <Plus size={16} /> Novo contrato
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={15} />
            <input
              className="input"
              placeholder="Buscar contrato, cliente ou produto"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="empty">
            <strong>Nenhum contrato encontrado</strong>
            Tente outro termo de busca ou cadastre um novo contrato.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Contrato</th>
                <th>Cliente</th>
                <th>Produto</th>
                <th>Progresso</th>
                <th>Saldo disponível</th>
                <th className="th-right" />
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const perc = Math.min(
                  100,
                  Math.round((c.quantidade_retirada_ton / (c.quantidade_total_ton || 1)) * 100)
                );
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="primary mono">{c.numero_contrato}</div>
                      <div className="secondary">{dataCurta(c.created_at)}</div>
                    </td>
                    <td>
                      <div className="primary">{c.cliente_nome}</div>
                      <div className="secondary mono">{c.cliente_cnpj} · {c.cliente_uf}</div>
                    </td>
                    <td>
                      <div className="primary">{c.produto}</div>
                      <div className="secondary">total {tonCurto(c.quantidade_total_ton)}</div>
                    </td>
                    <td>
                      <div className="progress">
                        <span style={{ width: `${perc}%` }} />
                      </div>
                      <div className="secondary num" style={{ marginTop: 4 }}>
                        {tonCurto(c.quantidade_retirada_ton)} ({perc}%)
                      </div>
                    </td>
                    <td className="num">
                      <div className="primary">{tonCurto(c.quantidade_saldo_ton)}</div>
                      <span className={`badge ${c.status === 'ATIVO' ? 'badge-ok' : 'badge-neutral'}`}>
                        {c.status === 'ATIVO' ? 'Ativo' : 'Concluído'}
                      </span>
                    </td>
                    <td className="td-right">
                      <button
                        className="btn btn-sm"
                        disabled={c.status !== 'ATIVO' || c.quantidade_saldo_ton <= 0}
                        onClick={() => setContratoParaOrdem(c)}
                      >
                        <Plus size={14} /> Emitir ordem
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showNovoContrato && (
        <NovoContratoModal
          proximoNumero={proximoNumero}
          usuarioEmail={usuario.email}
          onClose={() => setShowNovoContrato(false)}
          onCriar={(dados) => {
            dataService.criarPedidoMae(dados);
            toast('ok', `Contrato ${dados.numero_contrato} criado.`);
          }}
        />
      )}

      {contratoParaOrdem && (
        <NovaOrdemModal
          contratos={contratos}
          contratoInicial={contratoParaOrdem}
          onClose={() => setContratoParaOrdem(null)}
          onCriar={(dados) => {
            const nova = dataService.criarPedidoFilho(dados);
            toast('ok', `Ordem ${nova.numero_ordem} emitida.`);
          }}
        />
      )}
    </>
  );
}
