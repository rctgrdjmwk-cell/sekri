import { requireUser } from "@/lib/auth";
import { recipe } from "@/lib/professions";
import { listAppts, listClients, listMsgs } from "@/lib/store";
import { remaining } from "@/lib/secretary";
import { whatsappLink } from "@/lib/notify";
import { addDays, dayLabel, fmtDay, fmtTime, localDay } from "@/lib/time";
import type { Appt, Client } from "@/lib/types";

function ApptItem({ a, c }: { a: Appt; c?: Client }) {
  const w = c?.warnings[c.warnings.length - 1];
  return (
    <a href={`/appuntamento/${a.id}`} className="item">
      <span className="time">{fmtTime(a.start)}</span>
      <span className="grow">
        <b>{c?.name || "Cliente eliminato"}</b>
        <span className="sub" style={{ display: "block" }}>
          {w ? `⚠️ ${w.text}` : c?.fields.obiettivo || `${a.minutes} minuti${a.place ? " · " + a.place : ""}`}
        </span>
      </span>
      {a.status === "done" && <span className="pill">Fatto</span>}
      {a.status === "noshow" && <span className="pill warm">Non venuto</span>}
      {a.status === "planned" && a.confirm === "yes" && <span className="pill">Confermato</span>}
      {a.status === "planned" && a.confirm === "move" && <span className="pill warm">Vuole spostare</span>}
    </a>
  );
}

export default async function Oggi() {
  const u = await requireUser();
  const r = recipe(u.profession);
  const [appts, clients, msgs] = await Promise.all([listAppts(u.id), listClients(u.id), listMsgs(u.id)]);
  const byId = new Map(clients.map((c) => [c.id, c]));
  const today = localDay();
  const live = appts.filter((a) => a.status !== "cancelled");
  const todays = live.filter((a) => localDay(a.start) === today);
  const week = live.filter((a) => localDay(a.start) > today && localDay(a.start) <= addDays(today, 7) && a.status === "planned");
  const next = todays.find((a) => a.status === "planned" && new Date(a.start) > new Date());

  // Consigli della segretaria
  const newMsgs = msgs.filter((m) => m.status === "new").length;
  const cutoff = addDays(today, -21);
  const lost = clients.filter((c) => {
    if (localDay(c.createdAt) > cutoff) return false;
    const theirs = appts.filter((a) => a.clientId === c.id && a.status !== "cancelled");
    const future = theirs.some((a) => localDay(a.start) >= today);
    const recent = theirs.some((a) => localDay(a.start) >= cutoff);
    return !future && !recent;
  });
  const ending = clients.filter((c) => {
    const rem = remaining(c);
    return rem !== null && rem <= 2;
  });
  const hour = Number(fmtTime(new Date().toISOString()).slice(0, 2));
  const hello = hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

  return (
    <>
      <div>
        <div className="muted">{fmtDay(new Date().toISOString())}</div>
        <h1>{hello}, {u.name}</h1>
        <div className="muted">
          {todays.length ? `Oggi hai ${todays.length} ${todays.length === 1 ? r.clientWord : r.clientWord.replace(/o$/, "i")}.` : "Oggi non hai appuntamenti."}
          {next ? ` Il prossimo alle ${fmtTime(next.start)}.` : ""}
        </div>
      </div>

      {!clients.length && (
        <div className="card soft">
          <div className="label">Iniziamo</div>
          <div>Aggiungi il tuo primo cliente, poi il suo primo appuntamento. Ci vuole un minuto.</div>
          <a className="btn" href="/clienti">Aggiungi un cliente</a>
        </div>
      )}

      {!u.telegramChatId && clients.length > 0 && (
        <div className="card warm">
          <div className="label warm">Collega Telegram</div>
          <div className="small">Così ti arrivano i promemoria 30 minuti prima e i messaggi dei clienti.</div>
          <a className="btn ghost" href="/impostazioni">Collega in 1 minuto</a>
        </div>
      )}

      {todays.length > 0 && (
        <div className="list">
          {todays.map((a) => <ApptItem key={a.id} a={a} c={byId.get(a.clientId)} />)}
        </div>
      )}

      {(newMsgs > 0 || lost.length > 0 || ending.length > 0) && (
        <div className="card warm">
          <div className="label warm">Consigli della segretaria</div>
          {newMsgs > 0 && (
            <div className="row between">
              <span>📩 Hai {newMsgs} {newMsgs === 1 ? "messaggio nuovo" : "messaggi nuovi"} dai clienti.</span>
              <a href="/messaggi">Apri</a>
            </div>
          )}
          {lost.slice(0, 3).map((c) => (
            <div key={c.id} className="row between">
              <span>👋 {c.name} non viene da più di 3 settimane.</span>
              <a href={whatsappLink(`Ciao ${c.name.split(" ")[0]}! È da un po' che non ci vediamo. Fissiamo il prossimo ${r.clientWord}?`, c.phone)} target="_blank" rel="noreferrer">Scrivigli</a>
            </div>
          ))}
          {ending.slice(0, 3).map((c) => (
            <div key={c.id} className="row between">
              <span>💳 A {c.name} {remaining(c) === 1 ? "resta 1 lezione" : `restano ${remaining(c)} lezioni`} del pacchetto.</span>
              <a href={`/clienti/${c.id}`}>Vedi</a>
            </div>
          ))}
        </div>
      )}

      <div className="row between">
        <h2>Prossimi 7 giorni</h2>
        <a href="/agenda/nuovo">+ Nuovo</a>
      </div>
      {week.length ? (
        <div className="list">
          {week.map((a, i) => (
            <div key={a.id} className="list">
              {(i === 0 || localDay(week[i - 1].start) !== localDay(a.start)) && <div className="label" style={{ marginTop: 6 }}>{dayLabel(a.start)}</div>}
              <ApptItem a={a} c={byId.get(a.clientId)} />
            </div>
          ))}
        </div>
      ) : (
        <div className="muted">Niente in agenda nei prossimi giorni.</div>
      )}
    </>
  );
}
