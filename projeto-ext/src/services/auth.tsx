import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { registrar } from './observability';
import type { PerfilUsuario, UsuarioSessao } from '../types';

interface AuthContextValue {
  usuario: UsuarioSessao | null;
  carregando: boolean;
  erroPerfil: boolean;
  entrar: (email: string, senha: string) => Promise<string | null>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PERFIS: PerfilUsuario[] = ['ADMIN', 'LOGISTICA', 'COMERCIAL'];

function paraUsuario(session: Session | null): { usuario: UsuarioSessao | null; erroPerfil: boolean } {
  if (!session) return { usuario: null, erroPerfil: false };
  // O perfil fica em app_metadata: só pode ser alterado pelo administrador do projeto, nunca pelo próprio usuário.
  const perfil = session.user.app_metadata?.role as PerfilUsuario | undefined;
  if (!perfil || !PERFIS.includes(perfil)) return { usuario: null, erroPerfil: true };
  return {
    usuario: {
      id: session.user.id,
      email: session.user.email ?? '',
      nome: (session.user.user_metadata?.nome as string) || session.user.email || 'Usuário',
      perfil,
    },
    erroPerfil: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [erroPerfil, setErroPerfil] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const r = paraUsuario(data.session);
      setUsuario(r.usuario);
      setErroPerfil(r.erroPerfil);
      setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const r = paraUsuario(session);
      setUsuario(r.usuario);
      setErroPerfil(r.erroPerfil);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      registrar('warn', 'auth', `Falha de login para ${email.trim()}`);
      return 'E-mail ou senha incorretos.';
    }
    registrar('info', 'auth', `Login realizado: ${email.trim()}`, { usuario: email.trim() });
    return null;
  }, []);

  const sair = useCallback(async () => {
    if (usuario) registrar('info', 'auth', 'Sessão encerrada', { usuario: usuario.email });
    await supabase.auth.signOut();
  }, [usuario]);

  const value = useMemo(
    () => ({ usuario, carregando, erroPerfil, entrar, sair }),
    [usuario, carregando, erroPerfil, entrar, sair]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
