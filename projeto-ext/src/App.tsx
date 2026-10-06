import { useEffect, useState } from 'react';
import { Truck, Layers, Package, Activity } from 'lucide-react';
import { AuthProvider, useAuth } from './services/auth';
import { ToastProvider } from './components/Toast';
import { useDados } from './services/useDados';
import { dataService } from './services/dataService';
import { aguardando, retida } from './lib/format';
import { Shell, type NavGroup } from './components/Shell';
import { Login } from './pages/Login';
import { Fila } from './pages/Fila';
import { Contratos } from './pages/Contratos';
import { OrdensComercial } from './pages/OrdensComercial';
import { Observabilidade } from './pages/Observabilidade';

function AppConteudo() {
  const { usuario, carregando, erroPerfil, sair } = useAuth();
  const { ordens, notificacoes } = useDados();
  const [pagina, setPagina] = useState<string>('fila');

  // Ajusta a página padrão de acordo com o perfil autenticado
  useEffect(() => {
    if (!usuario) return;
    if (usuario.perfil === 'COMERCIAL') {
      setPagina('contratos');
    } else {
      setPagina('fila');
    }
  }, [usuario?.perfil]);

  if (carregando) {
    return (
      <div className="center-screen">
        <span className="spinner" style={{ width: 28, height: 28 }} />
      </div>
    );
  }

  if (erroPerfil) {
    return (
      <div className="center-screen" style={{ padding: 24, textAlign: 'center' }}>
        <div className="notice notice-err" style={{ maxWidth: 420, margin: '0 auto' }}>
          <strong>Acesso não configurado</strong>
          Esta conta não possui um perfil operacional habilitado. Entre em contato com a administração.
        </div>
        <button className="btn" style={{ marginTop: 12 }} onClick={sair}>
          Voltar ao login
        </button>
      </div>
    );
  }

  if (!usuario) {
    return <Login />;
  }

  const pendentes = ordens.filter(aguardando).length;
  const retidas = ordens.filter(retida).length;

  // Constrói menus restritos para cada papel de acesso
  let grupos: NavGroup[] = [];

  if (usuario.perfil === 'LOGISTICA') {
    grupos = [
      {
        itens: [
          { key: 'fila', label: 'Fila de carregamento', icon: Truck, contador: pendentes },
        ],
      },
    ];
  } else if (usuario.perfil === 'COMERCIAL') {
    grupos = [
      {
        itens: [
          { key: 'contratos', label: 'Contratos', icon: Layers },
          { key: 'ordens', label: 'Ordens & Retenções', icon: Package, contador: retidas },
        ],
      },
    ];
  } else {
    // ADMIN tem acesso total e observabilidade
    grupos = [
      {
        titulo: 'Operação',
        itens: [
          { key: 'fila', label: 'Fila de carregamento', icon: Truck, contador: pendentes },
          { key: 'contratos', label: 'Contratos', icon: Layers },
          { key: 'ordens', label: 'Ordens & Retenções', icon: Package, contador: retidas },
        ],
      },
      {
        titulo: 'Governança',
        itens: [
          { key: 'observabilidade', label: 'Observabilidade', icon: Activity },
        ],
      },
    ];
  }

  return (
    <Shell
      usuario={usuario}
      grupos={grupos}
      pagina={pagina}
      onNavegar={setPagina}
      onSair={sair}
      notificacoes={notificacoes}
      onLerNotificacao={(id) => dataService.marcarNotificacaoLida(id)}
      onLerTodas={() => dataService.marcarTodasNotificacoesLidas()}
    >
      {pagina === 'fila' && (usuario.perfil === 'LOGISTICA' || usuario.perfil === 'ADMIN') && (
        <Fila usuario={usuario} />
      )}

      {pagina === 'contratos' && (usuario.perfil === 'COMERCIAL' || usuario.perfil === 'ADMIN') && (
        <Contratos usuario={usuario} />
      )}

      {pagina === 'ordens' && (usuario.perfil === 'COMERCIAL' || usuario.perfil === 'ADMIN') && (
        <OrdensComercial usuario={usuario} />
      )}

      {pagina === 'observabilidade' && usuario.perfil === 'ADMIN' && (
        <Observabilidade />
      )}
    </Shell>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppConteudo />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
