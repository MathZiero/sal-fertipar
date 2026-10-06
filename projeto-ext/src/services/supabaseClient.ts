import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.PUBLISHABLE_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Configuração ausente: defina SUPABASE_URL e PUBLISHABLE_KEY no arquivo .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export interface SaudeServico {
  ok: boolean;
  latencia_ms: number;
  detalhe: string;
}

/** Verifica a disponibilidade do serviço de autenticação e do banco de dados. */
export async function verificarSaudeSupabase(): Promise<{ auth: SaudeServico; banco: SaudeServico }> {
  const t0 = performance.now();
  let auth: SaudeServico;
  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/health`, { headers: { apikey: supabaseKey } });
    auth = {
      ok: resp.ok,
      latencia_ms: Math.round(performance.now() - t0),
      detalhe: resp.ok ? 'Operacional' : `Resposta HTTP ${resp.status}`,
    };
  } catch (e) {
    auth = { ok: false, latencia_ms: Math.round(performance.now() - t0), detalhe: e instanceof Error ? e.message : 'Indisponível' };
  }

  const t1 = performance.now();
  let banco: SaudeServico;
  try {
    const { error } = await supabase.from('pedidos_mae').select('id').limit(1);
    const latencia_ms = Math.round(performance.now() - t1);
    if (!error) banco = { ok: true, latencia_ms, detalhe: 'Operacional' };
    else if (error.code === '42P01') banco = { ok: false, latencia_ms, detalhe: 'Tabelas não criadas' };
    else if (error.code === '42501') banco = { ok: false, latencia_ms, detalhe: 'Sem permissão de acesso às tabelas (RLS/grants)' };
    else banco = { ok: false, latencia_ms, detalhe: error.message };
  } catch (e) {
    banco = { ok: false, latencia_ms: Math.round(performance.now() - t1), detalhe: e instanceof Error ? e.message : 'Indisponível' };
  }

  return { auth, banco };
}
