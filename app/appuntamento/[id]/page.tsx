import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getAppt, getClient, listMsgs } from "@/lib/store";
import { briefLines } from "@/lib/secretary";
import { clientLink, whatsappLink } from "@/lib/notify";
import { dayLabel, fmtTime } from "@/lib/time";
import { recipe } from "@/lib/professions";
import VoiceNote from "@/components/VoiceNote";
import { removeAppt, setStatus } from "../../actions";

export default async function Appuntamento({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const { id } = await params;
  const a = await getAppt(u.id, id);
  if (!a) notFound();
  const c = await getClient(u.id, a.clientId);
  const msgs = await listMsgs(u.id);
  const r = recipe(u.profession);
  const when = `${dayLabel(a.start)} alle ${fmtTime(a.start)}`;
  const first = c?.name.split(" ")[0] || "";
  const confirmText = c ? `Ciao ${first}! Ti ricordo il nostro ${r.clientWord} ${when}${a.place ? ` (${a.place})` : ""}. Confermi? ${clientLink(c.token)}` : "";
  const status = (s: string, label: string, cls = "ghost") => (
    <form action={setStatus}>
      <input type="hidden" name="apptId" value={a.id} />
      <input type="hidden" name="status" value={s} />
      <button className={cls}>{label}</button>
    </form>
  );
  return (
    <>
      <a href="/oggi" className="small">← Oggi</a>
      <h1>{c?.name || "Cliente eliminato"}</h1>
      <div className="muted">
        {when[0].toUpperCase() + when.slice(1)} · {a.minutes} minuti{a.place ? ` · ${a.place}` : ""}
        {a.confirm === "yes" && " · ✅ ha confermato"}
        {a.confirm === "move" && " · 🔁 chiede di spostare"}
      </div>
      {c && (
        <div className="card">
          <div className="label">Scheda in breve</div>
          {briefLines(u, c, msgs).map((l, i) => <div key={i}>{l}</div>)}
          {!briefLines(u, c, msgs).length && <div className="muted small">Scheda ancora vuota.</div>}
          <a href={`/clienti/${c.id}`}>Apri la scheda completa</a>
        </div>
      )}
      <div className="card">
        <div className="label">Com&apos;è andata?</div>
        <div className="row">
          {status("done", "✅ Fatto", a.status === "done" ? "" : "ghost")}
          {status("noshow", "Non è venuto", a.status === "noshow" ? "" : "ghost")}
          {status("cancelled", "Annullato", a.status === "cancelled" ? "" : "ghost")}
          {a.status !== "planned" && status("planned", "Rimetti in programma", "plain")}
        </div>
        {c?.pkg && <div className="muted small">&quot;Fatto&quot; e &quot;Non è venuto&quot; scalano una lezione dal pacchetto.</div>}
      </div>
      {c && <VoiceNote clientId={c.id} hint={r.voiceHint} />}
      {c && a.status === "planned" && (
        <a className="btn ghost" href={whatsappLink(confirmText, c.phone)} target="_blank" rel="noreferrer">Chiedi conferma su WhatsApp</a>
      )}
      <form action={removeAppt}>
        <input type="hidden" name="apptId" value={a.id} />
        <button className="plain">Elimina questo appuntamento</button>
      </form>
    </>
  );
}
