import { useState } from 'react';
import { Search } from 'lucide-react';
import type { PedidoFilho, UsuarioSessao } from '../types';
import { useDados } from '../services/useDados';
import { dataService } from '../services/dataService';
import { consultarSintegraCnpjWs } from '../services/cnpjService';
import { aguardando, retida, situacaoOrdem, tonCurto } from '../lib/format';
import { useToast } from '../components/Toast';
import { OrdemDrawer } from '../components/OrdemDrawer';

type Filtro = 'aguardando' | 'retidas' | 'liberadas' | 'todas';

export function Fila({ usuario }: { usuario: UsuarioSessao }) {
  const { ordens } = useDados();
  const toast = useToast();
  const [filtro, setFiltro] = useState<Filtro>('aguardando');
  const [busca, setBusca] = useState('');
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [conferindo, setConferindo] = useState<string | null>(null);

  const contagem = {
    aguardando: ordens.filter(aguardando).length,
    retidas: ordens.filter(retida).length,
    liberadas: ordens.filter((o) => o.status === 'LIBERADO').length,
    todas: ordens.length,
  };

  const termo = busca.trim().toLowerCase();
  const lista = ordens
    .filter((o) =>
      filtro === 'aguardando' ? aguardando(o) : filtro === 'retidas' ? retida(o) : filtro === 'liberadas' ? o.status === 'LIBERADO' : true
    )
    .filter(
      (o) =>
        !termo ||
        [o.numero_ordem, o.placa_veiculo, o.cliente_nome, o.motorista_nome].some((v) => v.toLowerCase().includes(termo))
    );

  const selecionada = ordens.find((o) => o.id === selecionadaId) ?? null;

  async function conferir(o: PedidoFilho) {
    setConferindo(o.id);
    try {
      const consulta = await consultarSintegraCnpjWs(o.cliente_cnpj, o.cliente_ie, o.cliente_uf, usuario.email);
      const r = dataService.conferirELiberar(o.id, consulta, usuario.nome);
      if (r.sucesso) toast('ok', r.mensagem);
      else if (consulta.status === 'INDETERMINADO') toast('warn', r.mensagem);
      else toast('err', `${o.numero_ordem} retida. Veja o motivo nos detalhes.`);
    } finally {
      setConferindo(null);
    }
  }

  const rotulos: [Filtro, string][] = [
    ['aguardando', 'Aguardando'],
    ['retidas', 'Retidas'],
    ['liberadas', 'Liberadas'],
    ['todas', 'Todas'],
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Fila de carregamento</h1>
          <p>Confira cada ordem antes de liberar o caminhão para a baia.</p>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="tabs" role="tablist">
            {rotulos.map(([k, l]) => (
              <button key={k} className={`tab ${filtro === k ? 'active' : ''}`} onClick={() => setFiltro(k)}>
                {l}<span className="n">{contagem[k]}</span>
              </button>
            ))}
          </div>
          <div className="search">
            <Search size={15} />
            <input className="input" placeholder="Buscar ordem, placa ou cliente" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
        </div>

        {lista.length === 0 ? (
          <div className="empty"><strong>Nada por aqui</strong>Nenhuma ordem nesta visão.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Ordem</th>
                <th>Cliente</th>
                <th>Carga</th>
                <th>Situação</th>
                <th className="th-right" />
              </tr>
            </thead>
            <tbody>
              {lista.map((o) => {
                const sit = situacaoOrdem(o);
                const divergente = o.divergencia_ton !== 0;
                return (
                  <tr key={o.id} className="clickable" onClick={() => setSelecionadaId(o.id)}>
                    <td>
                      <div className="primary">{o.numero_ordem}</div>
                      <div className="secondary mono">{o.placa_veiculo}</div>
                    </td>
                    <td>
                      <div className="primary">{o.cliente_nome}</div>
                      <div className="secondary">{o.produto}</div>
                    </td>
                    <td className="num">
                      <div className="primary">{tonCurto(o.quantidade_ordem_ton)}</div>
                      {divergente && <div className="delta">programado {tonCurto(o.quantidade_programada_ton)}</div>}
                    </td>
                    <td><span className={`badge badge-${sit.tom}`}>{sit.label}</span></td>
                    <td className="td-right" onClick={(e) => e.stopPropagation()}>
                      {o.status !== 'LIBERADO' && (
                        <button className="btn btn-primary btn-sm" disabled={conferindo !== null} onClick={() => conferir(o)}>
                          {conferindo === o.id ? <span className="spinner" /> : null}
                          {conferindo === o.id ? 'Conferindo' : 'Conferir'}
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
            selecionada.status !== 'LIBERADO' && (
              <button className="btn btn-primary" disabled={conferindo !== null} onClick={() => conferir(selecionada)}>
                {conferindo === selecionada.id ? <span className="spinner" /> : null}
                Conferir e liberar
              </button>
            )
          }
        />
      )}
    </>
  );
}
