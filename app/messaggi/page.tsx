import { requireUser } from "@/lib/auth";
import { listClients, listMsgs, listAppts } from "@/lib/store";
import { CATEGORIES } from "@/lib/secretary";
import { dayLabel, fmtShort, fmtTime } from "@/lib/time";
import { msgAdd, msgReply } from "../actions";

export default async function Messaggi() {
  const u = await requireUser();
  const [msgs, clients, appts] = await Promise.all([listMsgs(u.id), listClients(u.id), listAppts(u.id)]);
  const byId = new Map(clients.map((c) => [c.id, c]));
  const now = new Date().toISOString();
  const nextFor = (cid: string) => appts.find((a) => a.clientId === cid && a.status === "planned" && a.start >= now);
  const open = msgs.filter((m) => m.status === "new");
  const done = msgs.filter((m) => m.status !== "new").slice(0, 15);
  return (
    <>
      <h1>Messaggi dei clienti</h1>
      <div className="muted">La segretaria ti passa i messaggi. Decidi tu: rispondi subito, oppure aggiungilo alla scheda e ne parlate al prossimo appuntamento.</div>
      {!open.length && <div className="card soft">Nessun messaggio da decidere. 👍</div>}
      {open.map((m) => {
        const c = byId.get(m.clientId);
        const next = nextFor(m.clientId);
        return (
          <div key={m.id} className="card">
            <div className="row between">
              <b>{c?.name || "Cliente"} · {fmtShort(m.createdAt)} {fmtTime(m.createdAt)}</b>
              <span className={`pill ${m.category === "infortunio" ? "warm" : ""}`}>{CATEGORIES.find((x) => x.id === m.category)?.label}</span>
            </div>
            <div>&quot;{m.text}&quot;</div>
            <div className="muted small">Prossimo appuntamento: {next ? `${dayLabel(next.start)} alle ${fmtTime(next.start)}` : "nessuno in agenda"}</div>
            <form action={msgAdd}>
              <input type="hidden" name="msgId" value={m.id} />
              <button className="full">📋 Aggiungi alla scheda, ne parliamo {next ? dayLabel(next.start) : "al prossimo appuntamento"}</button>
            </form>
            <details>
              <summary>✍️ Rispondo io adesso</summary>
              <form action={msgReply}>
                <input type="hidden" name="msgId" value={m.id} />
                <label>
                  La tua risposta a {c?.name.split(" ")[0]}
                  <textarea name="reply" required />
                </label>
                <button className="ghost">Invia</button>
              </form>
            </details>
          </div>
        );
      })}
      {done.length > 0 && <h2>Già gestiti</h2>}
      {done.map((m) => {
        const c = byId.get(m.clientId);
        const last = m.answers[m.answers.length - 1];
        return (
          <div key={m.id} className="card">
            <div className="row between">
              <b>{c?.name || "Cliente"} · {fmtShort(m.createdAt)}</b>
              <span className="pill gray">{m.status === "added" ? "In scheda" : "Risposto"}</span>
            </div>
            <div className="small">&quot;{m.text}&quot;</div>
            {last && <div className="muted small">Risposta ({last.from}): {last.text}</div>}
          </div>
        );
      })}
    </>
  );
}
