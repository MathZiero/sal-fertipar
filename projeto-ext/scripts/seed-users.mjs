// Cria (ou atualiza) os usuários iniciais do sistema no Supabase Auth.
// Executa apenas localmente, usando a chave de serviço do .env. Nunca é enviado ao navegador.
//
// Uso:
//   node scripts/seed-users.mjs            -> cria os usuários que ainda não existem
//   node scripts/seed-users.mjs --reset    -> também redefine as senhas de todos
import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';

process.loadEnvFile('.env');

const admin = createClient(process.env.SUPABASE_URL, process.env.SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const reset = process.argv.includes('--reset');

const usuarios = [
  { email: 'admin@sal-logistica.app', nome: 'Administrador', role: 'ADMIN' },
  { email: 'logistica@sal-logistica.app', nome: 'Operador de Logística', role: 'LOGISTICA' },
  { email: 'comercial@sal-logistica.app', nome: 'Analista Comercial', role: 'COMERCIAL' },
];

const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const gerarSenha = () => Array.from({ length: 14 }, () => alfabeto[randomInt(alfabeto.length)]).join('');

const { data: lista, error: erroLista } = await admin.auth.admin.listUsers({ perPage: 200 });
if (erroLista) {
  console.error('Falha ao listar usuários:', erroLista.message);
  process.exit(1);
}

for (const u of usuarios) {
  const existente = lista.users.find((x) => x.email === u.email);
  const metadados = { app_metadata: { role: u.role }, user_metadata: { nome: u.nome } };

  if (!existente) {
    const senha = gerarSenha();
    const { error } = await admin.auth.admin.createUser({
      email: u.email,
      password: senha,
      email_confirm: true,
      ...metadados,
    });
    console.log(error ? `ERRO  ${u.email}: ${error.message}` : `CRIADO ${u.role.padEnd(10)} ${u.email}  senha: ${senha}`);
  } else if (reset) {
    const senha = gerarSenha();
    const { error } = await admin.auth.admin.updateUserById(existente.id, { password: senha, ...metadados });
    console.log(error ? `ERRO  ${u.email}: ${error.message}` : `RESET  ${u.role.padEnd(10)} ${u.email}  senha: ${senha}`);
  } else {
    await admin.auth.admin.updateUserById(existente.id, metadados);
    console.log(`EXISTE ${u.role.padEnd(10)} ${u.email}  (perfil sincronizado, senha mantida)`);
  }
}
