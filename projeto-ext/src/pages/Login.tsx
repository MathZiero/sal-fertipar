import { useState, type FormEvent } from 'react';
import { useAuth } from '../services/auth';

export function Login() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const resultado = await entrar(email, senha);
    if (resultado) setErro(resultado);
    setEnviando(false);
  }

  return (
    <div className="login">
      <section className="login-art">
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <div className="brand-name">Fertipar</div>
            <div className="brand-sub" style={{ color: 'rgba(255,255,255,.6)' }}>Auxílio à Logística</div>
          </div>
        </div>
        <div>
          <h2>Cada carregamento conferido antes de chegar à expedição.</h2>
          <p>Tonelagem e situação fiscal do cliente validadas previamente, para evitar retrabalho no faturamento.</p>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>Uso restrito a colaboradores autorizados.</div>
      </section>

      <section className="login-form-wrap">
        <form className="login-form" onSubmit={enviar}>
          <h1>Entrar</h1>
          <p className="sub">Acesse com seu e-mail corporativo.</p>

          {erro && <div className="notice notice-err" role="alert">{erro}</div>}

          <div className="field">
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" autoComplete="username" required autoFocus
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="senha">Senha</label>
            <input id="senha" className="input" type="password" autoComplete="current-password" required
              value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>

          <button id="btn-entrar" className="btn btn-primary btn-block" style={{ height: 40, marginTop: 8 }} disabled={enviando}>
            {enviando ? <span className="spinner" /> : 'Entrar'}
          </button>
        </form>
      </section>
    </div>
  );
}
