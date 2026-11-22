import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { recipe } from "@/lib/professions";
import { getClient, listAppts, listMsgs } from "@/lib/store";
import { lastWeight, remaining } from "@/lib/secretary";
import { clientLink, whatsappLink } from "@/lib/notify";
import { dayLabel, fmtShort, fmtTime } from "@/lib/time";
import VoiceNote from "@/components/VoiceNote";
import CopyLink from "@/components/CopyLink";
import { addNote, addWarning, addWeight, deleteClient, removeWarning, setPackage, updateClient } from "../../actions";

const SOURCE: Record<string, string> = { trainer: "tu", voce: "nota a voce", cliente: "scritto dal cliente" };

export default async function Scheda({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuovo?: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const { nuovo } = await searchParams;
  const c = await getClient(u.id, id);
  if (!c) notFound();
  const r = recipe(u.profession);
  const [appts, msgs] = await Promise.all([listAppts(u.id), listMsgs(u.id)]);
  const now = new Date().toISOString();
  const mine = appts.filter((a) => a.clientId === c.id && a.status !== "cancelled");
  const next = mine.find((a) => a.status === "planned" && a.start >= now);
  const past = mine.filter((a) => a.start < now).slice(-5).reverse();
  const theirMsgs = msgs.filter((m) => m.clientId === c.id).slice(0, 5);
  const w = lastWeight(c);
  const rem = remaining(c);
  const link = clientLink(c.token);
  const first = c.name.split(" ")[0];
  const invite = `Ciao ${first}! Da oggi puoi scrivermi qui quando vuoi (un infortunio, una richiesta, spostare un appuntamento). La mia segretaria me lo passa subito: ${link}`;
  const maxKg = Math.max(...c.weights.map((x) => x.kg), 0);
  const minKg = Math.min(...c.weights.map((x) => x.kg), maxKg);

  return (
    <>
      <a href="/clienti" className="small">← Clienti</a>
      <div className="row">
        <h1 style={{ flex: 1 }}>{c.name}</h1>
        {c.phone && <a className="btn ghost" href={whatsappLink("", c.phone)} target="_blank" rel="noreferrer">WhatsApp</a>}
      </div>
      <div className="muted">
        {next ? `Prossimo ${r.clientWord}: ${dayLabel(next.start)} alle ${fmtTime(next.start)}` : "Nessun appuntamento in agenda"} ·{" "}
        <a href={`/agenda/nuovo?cliente=${c.id}`}>Fissa un appuntamento</a>
      </div>

      {nuovo && (
        <div className="card soft">
          <div className="label">Ultimo passo: manda il link a {first}</div>
          <div className="small">Con questo link {first} può scrivere alla tua segretaria e confermare gli appuntamenti, senza scaricare niente.</div>
          <div className="row">
            <a className="btn" href={whatsappLink(invite, c.phone)} target="_blank" rel="noreferrer">Manda su WhatsApp</a>
            <CopyLink url={link} />
          </div>
        </div>
      )}

      {c.warnings.length > 0 && (
        <div className="card warm">
          <div className="label warm">{r.warningLabel}</div>
          {c.warnings.map((x, i) => (
            <form key={i} action={removeWarning} className="inline" style={{ alignItems: "center" }}>
              <input type="hidden" name="clientId" value={c.id} />
              <input type="hidden" name="i" value={i} />
              <span style={{ flex: 1 }}>
                {x.text} <span className="muted small">({fmtShort(x.date)}, {SOURCE[x.source]})</span>
              </span>
              <button className="plain" aria-label={`Togli: ${x.text}`}>Risolto</button>
            </form>
          ))}
        </div>
      )}

      <VoiceNote clientId={c.id} hint={r.voiceHint} />

      {r.tracksWeight && (
        <div className="card">
          <div className="row between">
            <div className="label">Peso</div>
            {w && <b>{w.now} kg {w.diff !== 0 && <span className="muted small">({w.diff > 0 ? "+" : ""}{w.diff} kg dall&apos;inizio)</span>}</b>}
          </div>
          {c.weights.length > 1 && (
            <div className="spark" role="img" aria-label={`Andamento del peso: da ${c.weights[0].kg} a ${w?.now} kg`}>
              {c.weights.slice(-20).map((x, i) => (
                <i key={i} style={{ height: `${maxKg === minKg ? 60 : 20 + ((x.kg - minKg) / (maxKg - minKg)) * 80}%` }} title={`${fmtShort(x.date)}: ${x.kg} kg`} />
              ))}
            </div>
          )}
          <form action={addWeight} className="inline">
            <input type="hidden" name="clientId" value={c.id} />
            <label style={{ flex: 1 }}>
              Nuovo peso (kg)
              <input name="kg" inputMode="decimal" placeholder="es. 83,5" />
            </label>
            <button>Aggiungi</button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="label">Pacchetto lezioni</div>
        {c.pkg ? (
          <div className="grid2">
            <div className="tile"><b>{rem} di {c.pkg.total}</b><span>lezioni rimaste</span></div>
            <div className="tile"><b>{c.pkg.price ? `${c.pkg.price} CHF` : "—"}</b><span>prezzo del pacchetto</span></div>
          </div>
        ) : (
          <div className="muted small">Nessun pacchetto. Se ne crei uno, la segretaria conta le lezioni e ti avvisa quando sta per finire.</div>
        )}
        <form action={setPackage} className="inline">
          <input type="hidden" name="clientId" value={c.id} />
          <label style={{ flex: 1 }}>
            Lezioni
            <input name="total" inputMode="numeric" placeholder="es. 10" />
          </label>
          <label style={{ flex: 1 }}>
            Prezzo CHF
            <input name="price" inputMode="decimal" placeholder="es. 600" />
          </label>
          <button className="ghost">{c.pkg ? "Nuovo pacchetto" : "Crea"}</button>
        </form>
      </div>

      <div className="card">
        <div className="label">Note</div>
        {c.notes.slice(-8).reverse().map((n, i) => (
          <div key={i}>
            {n.text} <span className="muted small">({fmtShort(n.date)}, {SOURCE[n.source]})</span>
          </div>
        ))}
        {!c.notes.length && <div className="muted small">Ancora nessuna nota.</div>}
        <form action={addNote} className="inline">
          <input type="hidden" name="clientId" value={c.id} />
          <label style={{ flex: 1 }}>
            Scrivi una nota
            <input name="text" />
          </label>
          <button className="ghost">Aggiungi</button>
        </form>
        <form action={addWarning} className="inline">
          <input type="hidden" name="clientId" value={c.id} />
          <label style={{ flex: 1 }}>
            Nuova attenzione (infortunio, problema)
            <input name="text" />
          </label>
          <button className="ghost">Aggiungi</button>
        </form>
      </div>

      {theirMsgs.length > 0 && (
        <div className="card">
          <div className="label">Messaggi di {first}</div>
          {theirMsgs.map((m) => (
            <div key={m.id} className="small">
              <b>{fmtShort(m.createdAt)}:</b> {m.text}{" "}
              <span className={`pill ${m.status === "new" ? "warm" : "gray"}`}>{m.status === "new" ? "da decidere" : m.status === "added" ? "in scheda" : "risposto"}</span>
            </div>
          ))}
          <a href="/messaggi" className="small">Vai ai messaggi</a>
        </div>
      )}

      {past.length > 0 && (
        <div className="card">
          <div className="label">Ultimi appuntamenti</div>
          {past.map((a) => (
            <a key={a.id} href={`/appuntamento/${a.id}`} className="small">
              {fmtShort(a.start)} alle {fmtTime(a.start)} · {a.status === "done" ? "fatto" : a.status === "noshow" ? "non venuto" : "da segnare"}
            </a>
          ))}
        </div>
      )}

      <details className="card">
        <summary>Dati e scheda di {first}</summary>
        <form action={updateClient}>
          <input type="hidden" name="clientId" value={c.id} />
          <label>Nome<input name="name" defaultValue={c.name} required /></label>
          <label>Telefono<input name="phone" type="tel" defaultValue={c.phone} /></label>
          <label>Email<input name="email" type="email" defaultValue={c.email} /></label>
          {r.fields.map((f) =>
            f.options ? (
              <label key={f.key}>
                {f.label}
                <select name={`field_${f.key}`} defaultValue={c.fields[f.key] || ""}>
                  <option value="">—</option>
                  {f.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
            ) : (
              <label key={f.key}>
                {f.label}
                <input name={`field_${f.key}`} defaultValue={c.fields[f.key]} placeholder={f.placeholder} />
              </label>
            ),
          )}
          <label className="check">
            <input type="checkbox" name="waitlist" defaultChecked={c.waitlist} />
            Lista d&apos;attesa: vorrebbe un posto prima, se se ne libera uno
          </label>
          <button>Salva</button>
        </form>
        <div className="row">
          <a className="btn ghost" href={whatsappLink(invite, c.phone)} target="_blank" rel="noreferrer">Manda il suo link</a>
          <CopyLink url={link} />
        </div>
        <form action={deleteClient}>
          <input type="hidden" name="clientId" value={c.id} />
          <button className="danger">Elimina cliente e tutti i suoi dati</button>
        </form>
      </details>
    </>
  );
}
