import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";

export default async function Home() {
  if (await currentUser()) redirect("/oggi");
  return (
    <>
      <section className="hero">
        <h1>La segretaria digitale per personal trainer</h1>
        <p className="muted" style={{ fontSize: 17 }}>
          Agenda, schede clienti e un promemoria 30 minuti prima di ogni allenamento, con tutto quello che devi sapere su quel cliente.
        </p>
        <div className="row">
          <a className="btn" href="/registrati">Prova gratis</a>
          <a className="btn ghost" href="/accedi">Ho già un account</a>
        </div>
      </section>
      <div className="card">
        <div className="label">Cosa fa Sekri per te</div>
        <div>⏰ Ti ricorda ogni cliente 30 minuti prima, con la sua scheda in breve.</div>
        <div>💬 I tuoi clienti scrivono alla segretaria; tu decidi se rispondere subito o parlarne al prossimo allenamento.</div>
        <div>🎙️ Dopo l'allenamento detti una nota a voce: la scheda si compila da sola.</div>
        <div>✅ Il giorno prima chiede conferma ai clienti, così nessuno ti lascia a vuoto.</div>
        <div>💳 Tiene il conto dei pacchetti e ti propone il rinnovo al momento giusto.</div>
      </div>
    </>
  );
}
