import { register } from "../actions";

export default function Registrati() {
  return (
    <>
      <h1>Crea il tuo account</h1>
      <p className="muted">14 giorni gratis, senza carta di credito.</p>
      <form action={register} className="card">
        <label>
          Il tuo nome (come ti chiamano i clienti)
          <input name="name" required autoComplete="given-name" placeholder="es. Luca" />
        </label>
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Password (almeno 8 caratteri)
          <input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        <button>Crea account</button>
        <div className="muted small">
          Hai già un account? <a href="/accedi">Accedi</a>
        </div>
      </form>
    </>
  );
}
