import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env');

const admin = createClient(process.env.SUPABASE_URL, process.env.SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tabelas = ['pedidos_mae', 'pedidos_filho', 'notificacoes'];
for (const t of tabelas) {
  const { error } = await admin.from(t).select('id').limit(1);
  console.log(t, error ? `NAO EXISTE/ERRO: ${error.code} ${error.message}` : 'OK');
}

const { data, error } = await admin.auth.admin.listUsers();
console.log('usuarios auth:', error ? error.message : data.users.map((u) => `${u.email} role=${u.app_metadata?.role}`));
