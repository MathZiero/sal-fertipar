import { useState, type ReactNode } from 'react';
import { Bell, LogOut, type LucideIcon } from 'lucide-react';
import type { NotificacaoAlerta, UsuarioSessao } from '../types';
import { dataHora, PERFIL_LABEL } from '../lib/format';

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  contador?: number;
}
export interface NavGroup {
  titulo?: string;
  itens: NavItem[];
}

interface Props {
  usuario: UsuarioSessao;
  grupos: NavGroup[];
  pagina: string;
  onNavegar: (key: string) => void;
  onSair: () => void;
  notificacoes: NotificacaoAlerta[];
  onLerNotificacao: (id: string) => void;
  onLerTodas: () => void;
  children: ReactNode;
}

export function Shell({ usuario, grupos, pagina, onNavegar, onSair, notificacoes, onLerNotificacao, onLerTodas, children }: Props) {
  const [aberto, setAberto] = useState(false);

  const visiveis = notificacoes.filter(
    (n) => usuario.perfil === 'ADMIN' || n.destinatario === 'TODOS' || n.destinatario === usuario.perfil
  );
  const naoLidas = visiveis.filter((n) => !n.lida).length;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <div className="brand-name">Fertipar</div>
            <div className="brand-sub">Auxílio à Logística</div>
          </div>
        </div>

        <nav className="nav" aria-label="Navegação principal">
          {grupos.map((g, i) => (
            <div key={i}>
              {g.titulo && <div className="nav-group">{g.titulo}</div>}
              {g.itens.map((item) => (
                <button
                  key={item.key}
                  className={`nav-item ${pagina === item.key ? 'active' : ''}`}
                  onClick={() => onNavegar(item.key)}
                >
                  <item.icon size={17} />
                  <span>{item.label}</span>
                  {item.contador ? <span className="count">{item.contador}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="user-name">{usuario.nome}</div>
          <div className="user-role">{PERFIL_LABEL[usuario.perfil]}</div>
          <button className="btn btn-sm btn-block" onClick={onSair}>
            <LogOut size={15} /> Sair
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="popover-wrap">
            <button className="btn btn-ghost btn-icon" onClick={() => setAberto(!aberto)} aria-label="Avisos">
              <Bell size={18} />
              {naoLidas > 0 && <span className="bell-badge">{naoLidas}</span>}
            </button>
            {aberto && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 59 }} onClick={() => setAberto(false)} />
                <div className="popover">
                  <div className="popover-head">
                    <span>Avisos</span>
                    {naoLidas > 0 && (
                      <button className="btn btn-ghost btn-sm" onClick={onLerTodas}>Marcar como lidos</button>
                    )}
                  </div>
                  <div className="popover-list">
                    {visiveis.length === 0 ? (
                      <div className="empty">Nenhum aviso.</div>
                    ) : (
                      visiveis.slice(0, 12).map((n) => (
                        <div key={n.id} className={`notif ${n.lida ? '' : 'unread'}`} onClick={() => onLerNotificacao(n.id)}>
                          <span className="dot" />
                          <div>
                            <div className="primary">{n.titulo}</div>
                            <div className="secondary">{n.mensagem}</div>
                            <div className="secondary" style={{ fontSize: 12, marginTop: 2 }}>{dataHora(n.created_at)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
