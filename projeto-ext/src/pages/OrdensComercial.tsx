import { useState } from 'react';
import { Plus, RotateCcw, Search } from 'lucide-react';
import type { PedidoFilho, UsuarioSessao } from '../types';
import { useDados } from '../services/useDados';
import { dataService } from '../services/dataService';
import { retida, situacaoOrdem, tonCurto } from '../lib/format';
import { useToast } from '../components/Toast';
import { OrdemDrawer } from '../components/OrdemDrawer';
import { NovaOrdemModal } from '../components/NovaOrdemModal';
import { CorrigirOrdemModal } from '../components/CorrigirOrdemModal';

type Filtro = 'retidas' | 'reenviadas' | 'liberadas' | 'todas';

export function OrdensComercial({ usuario }: { usuario: UsuarioSessao }) {
  const { ordens, contratos } = useDados();
  const toast = useToast();
  const [filtro, setFiltro] = useState<Filtro>('retidas');
  const [busca, setBusca] = useState('');
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [ordemParaCorrigir, setOrdemParaCorrigir] = useState<PedidoFilho | null>(null);
  const [showNovaOrdem, setShowNovaOrdem] = useState(false);

  const contagem = {
    retidas: ordens.filter(retida).length,
    reenviadas: ordens.filter((o) => o.status === 'EM_RESSUBMISSAO').length,
    liberadas: ordens.filter((o) => o.status === 'LIBERADO').length,
    todas: ordens.length,
  };

  const termo = busca.trim().toLowerCase();
  const lista = ordens
    .filter((o) => {
      if (filtro === 'retidas') return retida(o);
      if (filtro === 'reenviadas') return o.status === 'EM_RESSUBMISSAO';
      if (filtro === 'liberadas') return o.status === 'LIBERADO';
      return true;
    })
    .filter(
      (o) =>
        !termo ||
        [o.numero_ordem, o.cliente_nome, o.placa_veiculo, o.pedido_mae_numero].some((v) =>
          v.toLowerCase().includes(termo)
        )
    );

  const selecionada = ordens.find((o) => o.id === selecionadaId) ?? null;

  const rotulos: [Filtro, string][] = [
    ['retidas', 'Retidas'],
    ['reenviadas', 'Reenviadas'],
    ['liberadas', 'Liberadas'],
    ['todas', 'Todas'],
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ordens de carregamento</h1>
          <p>Acompanhamento de ordens emitidas e tratamento de retenções.</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowNovaOrdem(true)}>
            <Plus size={16} /> Emitir ordem
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="tabs" role="tablist">
            {rotulos.map(([k, l]) => (
              <button key={k} className={`tab ${filtro === k ? 'active' : ''}`} onClick={() => setFiltro(k)}>
                {l}
                <span className="n">{contagem[k]}</span>
              </button>
            ))}
          </div>
          <div className="search">
            <Search size={15} />
            <input
              className="input"
              placeholder="Buscar ordem, cliente ou placa"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="empty">
            <strong>Nenhuma ordem nesta visão</strong>
            {filtro === 'retidas'
              ? 'Não há ordens retidas necessitando de ajuste no momento.'
              : 'Nenhum registro encontrado.'}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Ordem</th>
                <th>Cliente / Contrato</th>
                <th>Carga</th>
                <th>Situação</th>
                <th className="th-right" />
              </tr>
            </thead>
            <tbody>
              {lista.map((o) => {
                const sit = situacaoOrdem(o);
                const divergente = o.divergencia_ton !== 0;
                const podeCorrigir = retida(o);

                return (
                  <tr key={o.id} className="clickable" onClick={() => setSelecionadaId(o.id)}>
                    <td>
                      <div className="primary">{o.numero_ordem}</div>
                      <div className="secondary mono">{o.placa_veiculo}</div>
                    </td>
                    <td>
                      <div className="primary">{o.cliente_nome}</div>
                      <div className="secondary mono">{o.pedido_mae_numero} · {o.produto}</div>
                    </td>
                    <td className="num">
                      <div className="primary">{tonCurto(o.quantidade_ordem_ton)}</div>
                      {divergente && (
                        <div className="delta">programado {tonCurto(o.quantidade_programada_ton)}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${sit.tom}`}>{sit.label}</span>
                    </td>
                    <td className="td-right" onClick={(e) => e.stopPropagation()}>
                      {podeCorrigir && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setOrdemParaCorrigir(o)}
                        >
                          <RotateCcw size={13} /> Corrigir e reenviar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selecionada && (
        <OrdemDrawer
          ordem={selecionada}
          onClose={() => setSelecionadaId(null)}
          acoes={
            retida(selecionada) && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setOrdemParaCorrigir(selecionada);
                  setSelecionadaId(null);
                }}
              >
                <RotateCcw size={15} /> Corrigir e reenviar
              </button>
            )
          }
        />
      )}

      {ordemParaCorrigir && (
        <CorrigirOrdemModal
          ordem={ordemParaCorrigir}
          onClose={() => setOrdemParaCorrigir(null)}
          onEnviar={(qtd, justificativa) => {
            dataService.ressubmeterPedidoFilho(ordemParaCorrigir.id, qtd, justificativa, usuario.nome);
            toast('ok', `Ordem ${ordemParaCorrigir.numero_ordem} reenviada para conferência da logística.`);
          }}
        />
      )}

      {showNovaOrdem && (
        <NovaOrdemModal
          contratos={contratos}
          onClose={() => setShowNovaOrdem(false)}
          onCriar={(dados) => {
            const nova = dataService.criarPedidoFilho(dados);
            toast('ok', `Ordem ${nova.numero_ordem} emitida.`);
          }}
        />
      )}
    </>
  );
}
