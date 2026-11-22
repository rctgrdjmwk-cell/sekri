import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { byToken, listMsgs, nextApptFor } from "@/lib/store";
import { CATEGORIES } from "@/lib/secretary";
import { dayLabel, fmtShort, fmtTime } from "@/lib/time";
import { recipe } from "@/lib/professions";
import { clientAnswer, clientSend } from "../../actions";

export const metadata: Metadata = { title: "Scrivi alla segretaria", robots: { index: false } };

export default async function PaginaCliente({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await byToken(token);
  if (!found) notFound();
  const { user: u, client: c } = found;
  const r = recipe(u.profession);
  const next = await nextApptFor(u.id, c.id);
  const msgs = (await listMsgs(u.id)).filter((m) => m.clientId === c.id).slice(0, 10).reverse();
  const first = c.name.split(" ")[0];
  return (
    <>
      <div className="row">
        <div className="logo"><i aria-hidden="true">{u.name[0]}</i></div>
        <div>
          <h1 style={{ fontSize: 22 }}>Segretaria di {u.name}</h1>
          <div className="muted small">{r.name}</div>
        </div>
      </div>
      <div className="muted">Ciao {first}! Scrivimi qui quando vuoi: passo tutto a {u.name}.</div>

      {next && (
        <div className="card soft">
          <div className="label">Il tuo prossimo {r.clientWord}</div>
          <b style={{ fontSize: 18 }}>
            {dayLabel(next.start)[0].toUpperCase() + dayLabel(next.start).slice(1)} alle {fmtTime(next.start)}
          </b>
          {next.place && <div className="small">{next.place}</div>}
          {next.confirm === "yes" ? (
            <div>✅ Hai confermato. A presto!</div>
          ) : next.confirm === "move" ? (
            <div>🔁 Hai chiesto di spostarlo: {u.name} ti scrive per un nuovo orario.</div>
          ) : (
            <div className="grid2">
              <form action={clientAnswer}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="apptId" value={next.id} />
                <input type="hidden" name="answer" value="yes" />
                <button className="full">Confermo</button>
              </form>
              <form action={clientAnswer}>
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="apptId" value={next.id} />
                <input type="hidden" name="answer" value="move" />
                <button className="ghost full">Devo spostarlo</button>
              </form>
            </div>
          )}
        </div>
      )}

      {msgs.length > 0 && (
        <div className="card chat" aria-label="I tuoi messaggi">
          {msgs.map((m) => (
            <div key={m.id} className="chat">
              <div className="bubble me"><span className="who">Tu · {fmtShort(m.createdAt)}</span>{m.text}</div>
              {m.answers.map((a, i) => (
                <div key={i} className="bubble">
                  <span className="who">{a.from === "professionista" ? u.name : "Segretaria"}</span>
                  {a.text}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <form action={clientSend} className="card">
        <input type="hidden" name="token" value={token} />
        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Di cosa vuoi parlare?</legend>
          <div className="chips">
            {CATEGORIES.map((x, i) => (
              <label key={x.id}>
                <input type="radio" name="category" value={x.id} defaultChecked={i === 0} />
                <span>{x.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          Il tuo messaggio
          <textarea name="text" required maxLength={2000} placeholder="Scrivi qui…" />
        </label>
        <button>Invia a {u.name}</button>
      </form>
      <div className="muted small">Questa pagina è solo tua: non condividere il link.</div>
    </>
  );
}
