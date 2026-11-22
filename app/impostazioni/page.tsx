import { requireUser } from "@/lib/auth";
import { recipe } from "@/lib/professions";
import { botUsername, emailReady, telegramReady } from "@/lib/notify";
import { hasAI } from "@/lib/ai";
import { activateBot, saveSettings } from "../actions";

export default async function Impostazioni() {
  const u = await requireUser();
  const bot = telegramReady() ? await botUsername() : null;
  const admin = process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.toLowerCase() === u.email;
  return (
    <>
      <h1>Profilo</h1>
      <div className="muted">{u.email} · {recipe(u.profession).name}</div>

      <div className={`card ${u.telegramChatId ? "soft" : "warm"}`}>
        <div className={`label ${u.telegramChatId ? "" : "warm"}`}>Telegram</div>
        {u.telegramChatId ? (
          <div>✅ Collegato. Qui ti arrivano promemoria e messaggi dei clienti.</div>
        ) : bot ? (
          <>
            <div className="small">
              1. Se non ce l&apos;hai, scarica Telegram sul telefono.<br />
              2. Tocca il pulsante qui sotto e poi <b>Avvia</b>.
            </div>
            <a className="btn" href={`https://t.me/${bot}?start=${u.linkCode}`} target="_blank" rel="noreferrer">Collega Telegram</a>
            <div className="muted small">Dopo aver premuto Avvia, ricarica questa pagina.</div>
          </>
        ) : (
          <div className="small">Il bot di Telegram non è ancora attivo su questo sito.</div>
        )}
      </div>

      <form action={saveSettings} className="card">
        <div className="label">Il tuo profilo</div>
        <label>
          Il tuo nome (lo vedono i clienti)
          <input name="name" defaultValue={u.name} required />
        </label>
        <div className="label" style={{ marginTop: 8 }}>Orario di riposo</div>
        <div className="muted small">In questo orario la segretaria non ti disturba con i messaggi dei clienti: risponde lei che ti fai sentire domattina.</div>
        <div className="grid2">
          <label>Dalle<input name="quietFrom" type="time" defaultValue={u.quietFrom || "20:30"} /></label>
          <label>Alle<input name="quietTo" type="time" defaultValue={u.quietTo || "07:30"} /></label>
        </div>
        <button>Salva</button>
      </form>

      {admin && (
        <div className="card">
          <div className="label">Gestione del sito (solo per te)</div>
          <div className="small">
            Telegram: {telegramReady() ? `✅ ${bot ? "@" + bot : "token presente"}` : "❌ manca TELEGRAM_BOT_TOKEN"}<br />
            Email ai clienti: {emailReady() ? "✅ attive" : "❌ mancano BREVO_API_KEY e SENDER_EMAIL"}<br />
            Cervello AI: {hasAI() ? "✅ attivo" : "❌ manca ANTHROPIC_API_KEY"}<br />
            Controlli automatici: {process.env.CRON_SECRET ? "✅ CRON_SECRET presente" : "❌ manca CRON_SECRET"}
          </div>
          <form action={activateBot}>
            <button className="ghost">Attiva il bot di Telegram</button>
          </form>
        </div>
      )}
    </>
  );
}
