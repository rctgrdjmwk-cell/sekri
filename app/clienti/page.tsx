import { requireUser } from "@/lib/auth";
import { listClients } from "@/lib/store";
import { remaining } from "@/lib/secretary";
import { addClient } from "../actions";

export default async function Clienti() {
  const u = await requireUser();
  const clients = await listClients(u.id);
  return (
    <>
      <h1>I tuoi clienti</h1>
      <details className="card" open={!clients.length}>
        <summary>+ Aggiungi un cliente</summary>
        <form action={addClient}>
          <label>
            Nome e cognome
            <input name="name" required placeholder="es. Marco Rossi" />
          </label>
          <label>
            Telefono (per WhatsApp)
            <input name="phone" type="tel" placeholder="es. +41 79 123 45 67" />
          </label>
          <label>
            Email (facoltativa: serve per i messaggi automatici)
            <input name="email" type="email" />
          </label>
          <button>Aggiungi</button>
        </form>
      </details>
      <div className="list">
        {clients.map((c) => {
          const rem = remaining(c);
          return (
            <a key={c.id} href={`/clienti/${c.id}`} className="item">
              <span className="grow">
                <b>{c.name}</b>
                <span className="sub" style={{ display: "block" }}>
                  {c.fields.obiettivo || "Scheda da completare"}
                </span>
              </span>
              {c.warnings.length > 0 && <span className="pill warm">⚠️ {c.warnings.length}</span>}
              {rem !== null && <span className={`pill ${rem <= 2 ? "warm" : ""}`}>{rem} lez.</span>}
              {c.waitlist && <span className="pill gray">In attesa</span>}
            </a>
          );
        })}
      </div>
      {!clients.length && <div className="muted">Ancora nessun cliente.</div>}
    </>
  );
}
