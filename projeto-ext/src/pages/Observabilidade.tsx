import { useEffect, useState } from 'react';
import { RefreshCw, Trash2, Search, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useEventos, limparEventos, calcularMetricasConsulta, type NivelLog, type OrigemLog } from '../services/observability';
import { verificarSaudeSupabase, type SaudeServico } from '../services/supabaseClient';
import { dataCompleta } from '../lib/format';
import { useToast } from '../components/Toast';

export function Observabilidade() {
  const eventos = useEventos();
  const toast = useToast();
  const [saude, setSaude] = useState<{ auth: SaudeServico; banco: SaudeServico } | null>(null);
  const [carregandoSaude, setCarregandoSaude] = useState(false);
  const [busca, setBusca] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState<'todos' | NivelLog>('todos');
  const [origemFiltro, setOrigemFiltro] = useState<'todas' | OrigemLog>('todas');

  const metricas = calcularMetricasConsulta(eventos, 24);

  async function checarSaude() {
    setCarregandoSaude(true);
    try {
      const res = await verificarSaudeSupabase();
      setSaude(res);
    } catch {
      toast('err', 'Erro ao obter integridade dos serviços.');
    } finally {
      setCarregandoSaude(false);
    }
  }

  useEffect(() => {
    checarSaude();
  }, []);

  const termo = busca.trim().toLowerCase();
  const eventosFiltrados = eventos.filter((e) => {
    if (nivelFiltro !== 'todos' && e.nivel !== nivelFiltro) return false;
    if (origemFiltro !== 'todas' && e.origem !== origemFiltro) return false;
    if (!termo) return true;
    return (
      e.mensagem.toLowerCase().includes(termo) ||
      (e.usuario && e.usuario.toLowerCase().includes(termo)) ||
      e.origem.toLowerCase().includes(termo)
    );
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Observabilidade & Auditoria</h1>
          <p>Métricas de conformidade técnica, integridade dos serviços e trilha de eventos operacionais.</p>
        </div>
        <div className="page-actions">
          <button className="btn" disabled={carregandoSaude} onClick={checarSaude}>
            <RefreshCw size={15} className={carregandoSaude ? 'spinner' : ''} />
            Atualizar status
          </button>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="stat-label">Consultas cadastrais (24h)</div>
          <div className="stat-value">{metricas.total}</div>
          <div className="stat-note">
            {metricas.sucessos} confirmadas · {metricas.falhas} indisponíveis
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">Taxa de sucesso cadastral</div>
          <div className="stat-value">{metricas.total ? `${metricas.taxaSucesso.toFixed(1)}%` : '100%'}</div>
          <div className="stat-note">Sem falhas operacionais críticas</div>
        </div>

        <div className="stat">
          <div className="stat-label">Latência média</div>
          <div className="stat-value">{metricas.latenciaMedia} ms</div>
          <div className="stat-note">P95: {metricas.latenciaP95} ms</div>
        </div>

        <div className="stat">
          <div className="stat-label">Dentro do limite de 5s</div>
          <div className="stat-value">{metricas.total ? `${metricas.dentroDoLimite.toFixed(0)}%` : '100%'}</div>
          <div className="stat-note">Tempo de resposta da portaria</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Disponibilidade dos serviços conectados</h2>
          <span className="secondary mono" style={{ fontSize: 12 }}>
            Verificado em tempo real
          </span>
        </div>
        <div>
          <div className="health-row">
            <div>
              <div className="primary">Serviço de Autenticação</div>
              <div className="secondary">Provedor de identidade e controle de sessões</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="mono secondary">{saude ? `${saude.auth.latencia_ms} ms` : '—'}</span>
              {saude?.auth.ok ? (
                <span className="badge badge-ok">
                  <CheckCircle2 size={13} /> {saude.auth.detalhe}
                </span>
              ) : (
                <span className="badge badge-err">
                  <XCircle size={13} /> {saude ? saude.auth.detalhe : 'Consultando...'}
                </span>
              )}
            </div>
          </div>

          <div className="health-row">
            <div>
              <div className="primary">Banco de Dados & Controle de Acesso (RLS)</div>
              <div className="secondary">Repositório relacional de contratos e ordens de carregamento</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span className="mono secondary">{saude ? `${saude.banco.latencia_ms} ms` : '—'}</span>
              {saude?.banco.ok ? (
                <span className="badge badge-ok">
                  <CheckCircle2 size={13} /> {saude.banco.detalhe}
                </span>
              ) : (
                <span className="badge badge-warn">
                  <AlertTriangle size={13} /> {saude ? saude.banco.detalhe : 'Consultando...'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Trilha de auditoria e eventos do sistema</h2>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (window.confirm('Limpar registro local de eventos de auditoria?')) {
                limparEventos();
                toast('info', 'Registros de auditoria locais limpos.');
              }
            }}
          >
            <Trash2 size={14} /> Limpar eventos
          </button>
        </div>

        <div className="toolbar">
          <div className="tabs" role="tablist">
            <button
              className={`tab ${nivelFiltro === 'todos' ? 'active' : ''}`}
              onClick={() => setNivelFiltro('todos')}
            >
              Todos <span className="n">{eventos.length}</span>
            </button>
            <button
              className={`tab ${nivelFiltro === 'info' ? 'active' : ''}`}
              onClick={() => setNivelFiltro('info')}
            >
              Informativos <span className="n">{eventos.filter((e) => e.nivel === 'info').length}</span>
            </button>
            <button
              className={`tab ${nivelFiltro === 'warn' ? 'active' : ''}`}
              onClick={() => setNivelFiltro('warn')}
            >
              Avisos <span className="n">{eventos.filter((e) => e.nivel === 'warn').length}</span>
            </button>
            <button
              className={`tab ${nivelFiltro === 'error' ? 'active' : ''}`}
              onClick={() => setNivelFiltro('error')}
            >
              Erros <span className="n">{eventos.filter((e) => e.nivel === 'error').length}</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className="select"
              style={{ width: 140, height: 36 }}
              value={origemFiltro}
              onChange={(e) => setOrigemFiltro(e.target.value as any)}
            >
              <option value="todas">Todos módulos</option>
              <option value="auth">Autenticação</option>
              <option value="consulta">Consulta Fiscal</option>
              <option value="ordem">Ordens</option>
              <option value="sistema">Sistema</option>
            </select>

            <div className="search">
              <Search size={15} />
              <input
                className="input"
                placeholder="Filtrar por mensagem ou usuário"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
        </div>

        {eventosFiltrados.length === 0 ? (
          <div className="empty">
            <strong>Nenhum evento registrado</strong>
            Nenhum registro coincide com os filtros aplicados.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Nível</th>
                <th>Módulo</th>
                <th>Descrição do evento</th>
                <th>Usuário</th>
                <th className="th-right">Duração</th>
              </tr>
            </thead>
            <tbody>
              {eventosFiltrados.slice(0, 100).map((evt) => (
                <tr key={evt.id}>
                  <td className="mono secondary" style={{ whiteSpace: 'nowrap' }}>
                    {dataCompleta(evt.ts)}
                  </td>
                  <td>
                    <span className={`level ${evt.nivel}`}>{evt.nivel}</span>
                  </td>
                  <td>
                    <span className="badge badge-neutral mono" style={{ textTransform: 'uppercase' }}>
                      {evt.origem}
                    </span>
                  </td>
                  <td>
                    <div className="primary">{evt.mensagem}</div>
                  </td>
                  <td className="secondary mono">{evt.usuario || 'sistema'}</td>
                  <td className="td-right mono secondary">
                    {evt.duracao_ms !== undefined ? `${evt.duracao_ms} ms` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
