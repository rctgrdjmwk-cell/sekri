import { login } from "../actions";

export default function Accedi() {
  return (
    <>
      <h1>Bentornato</h1>
      <form action={login} className="card">
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button>Accedi</button>
        <div className="muted small">
          Nuovo su Sekri? <a href="/registrati">Crea un account</a>
        </div>
      </form>
    </>
  );
}
