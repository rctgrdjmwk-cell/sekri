// Il comportamento della segretaria: promemoria, messaggi dei clienti, note a voce, pacchetti.
// Regola d'oro: la segretaria non promette mai niente al cliente prima che il professionista abbia deciso.
import { get, newId, put } from "./db";
import { parseJson, tryAsk } from "./ai";
import { recipe } from "./professions";
import { appUrl, clientLink, sendEmail, tellPro, whatsappLink } from "./notify";
import { addDays, dayLabel, fmtShort, fmtTime, inQuiet, localDay, nowHHMM } from "./time";
import { getAppt, getClient, getMsg, listAppts, listClients, nextApptFor, saveAppt, saveClient, saveMsg, allUsers } from "./store";
import type { Appt, Client, Msg, MsgCategory, User } from "./types";

export const CATEGORIES: { id: MsgCategory; label: string }[] = [
  { id: "infortunio", label: "Infortunio o dolore" },
  { id: "esercizio", label: "Vorrei un esercizio nuovo" },
  { id: "appuntamento", label: "Spostare un appuntamento" },
  { id: "altro", label: "Altro" },
];
const catLabel = (c: MsgCategory) => CATEGORIES.find((x) => x.id === c)?.label || c;
const first = (name: string) => name.split(" ")[0];

// ---------- Scheda in breve ----------
export function lastWeight(c: Client) {
  const w = c.weights;
  if (!w.length) return null;
  const now = w[w.length - 1].kg;
  const diff = Math.round((now - w[0].kg) * 10) / 10;
  return { now, diff };
}

export function remaining(c: Client): number | null {
  return c.pkg ? Math.max(0, c.pkg.total - c.pkg.used) : null;
}

/** Le righe più utili della scheda, per il promemoria. */
export function briefLines(u: User, c: Client, msgs: Msg[] = []): string[] {
  const r = recipe(u.profession);
  const lines: string[] = [];
  for (const f of r.fields.slice(0, 2)) if (c.fields[f.key]) lines.push(`${f.label}: ${c.fields[f.key]}`);
  const w = lastWeight(c);
  if (r.tracksWeight && w) lines.push(`Peso: ${w.now} kg${w.diff ? ` (${w.diff > 0 ? "+" : ""}${w.diff} kg dall'inizio)` : ""}`);
  for (const x of c.warnings.slice(-2)) lines.push(`⚠️ Attenzione: ${x.text}`);
  const note = c.notes[c.notes.length - 1];
  if (note) lines.push(`Ultima nota (${fmtShort(note.date)}): ${note.text}`);
  for (const m of msgs.filter((m) => m.clientId === c.id && m.status === "added").slice(0, 2))
    lines.push(`💬 ${first(c.name)} ha scritto il ${fmtShort(m.createdAt)}: "${m.text}" (gli hai detto che ne parlate)`);
  const rem = remaining(c);
  if (rem !== null) lines.push(`Pacchetto: ${rem} ${rem === 1 ? "lezione rimasta" : "lezioni rimaste"}`);
  return lines;
}

// ---------- Promemoria 30 minuti prima ----------
export async function reminderText(u: User, a: Appt, c: Client, msgs: Msg[]): Promise<string> {
  const lines = briefLines(u, c, msgs);
  let text = `⏰ Tra 30 minuti: ${c.name}\nOre ${fmtTime(a.start)}${a.place ? ` · ${a.place}` : ""} · ${a.minutes} minuti\n\n${lines.join("\n") || "Scheda ancora vuota."}`;
  const tip = await tryAsk(
    `Sei la segretaria di un ${recipe(u.profession).name.toLowerCase()}. Dai UN consiglio pratico e breve (massimo 25 parole, in italiano) per l'appuntamento che sta per iniziare, basato solo sulla scheda. Niente saluti, niente diagnosi mediche.`,
    lines.join("\n"),
    800,
  );
  if (tip) text += `\n\n💡 ${tip}`;
  return text;
}

// ---------- Messaggi dei clienti ----------
export async function clientWrites(u: User, c: Client, category: MsgCategory, text: string): Promise<Msg> {
  const quiet = inQuiet(u.quietFrom, u.quietTo);
  const msg: Msg = {
    id: newId(),
    clientId: c.id,
    category,
    text: text.trim().slice(0, 2000),
    createdAt: new Date().toISOString(),
    status: "new",
    answers: [
      {
        date: new Date().toISOString(),
        from: "segretaria",
        text: quiet
          ? `Grazie ${first(c.name)}! Ho ricevuto il tuo messaggio. ${u.name} adesso è a riposo: glielo passo e ti faccio sapere io domattina.`
          : `Grazie ${first(c.name)}${category === "infortunio" ? ", mi dispiace!" : "!"} Ho passato subito il tuo messaggio a ${u.name}. Ti faccio sapere io cosa decide.`,
      },
    ],
  };
  await saveMsg(u.id, msg);
  if (!quiet) await notifyNewMsg(u, c, msg);
  return msg;
}

export async function notifyNewMsg(u: User, c: Client, m: Msg) {
  const next = await nextApptFor(u.id, c.id);
  const when = next ? `${dayLabel(next.start)} alle ${fmtTime(next.start)}` : "nessuno in agenda";
  await tellPro(u, `📩 ${c.name} ti ha scritto (${catLabel(m.category)}):\n\n"${m.text}"\n\nProssimo appuntamento: ${when}\n\nCosa faccio?`, [
    [{ text: "✍️ Rispondo io adesso", data: `rp:${m.id}` }],
    [{ text: next ? `📋 Aggiungi alla scheda, ne parliamo ${dayLabel(next.start)}` : "📋 Aggiungi alla scheda", data: `ad:${m.id}` }],
  ]);
}

async function tellClient(u: User, c: Client, text: string) {
  if (c.email)
    await sendEmail(c.email, `Messaggio da ${u.name}`, `${text}\n\nPer rispondere o vedere i tuoi appuntamenti: ${clientLink(c.token)}`, `Segretaria di ${u.name}`);
}

/** Il professionista sceglie "Aggiungi alla scheda": la segretaria avvisa il cliente. */
export async function decideAdd(u: User, msgId: string): Promise<string> {
  const m = await getMsg(u.id, msgId);
  if (!m) return "Non trovo più questo messaggio.";
  const c = await getClient(u.id, m.clientId);
  if (!c) return "Non trovo più questo cliente.";
  if (m.status !== "new") return "Questo messaggio era già stato gestito.";
  const entry = { date: m.createdAt, text: m.text, source: "cliente" as const };
  if (m.category === "infortunio") c.warnings.push(entry);
  else c.notes.push(entry);
  await saveClient(u.id, c);
  const next = await nextApptFor(u.id, c.id);
  const answer = next
    ? `Ciao ${first(c.name)}, ${u.name} ha ricevuto il tuo messaggio. Ne parlerete insieme ${dayLabel(next.start)} alle ${fmtTime(next.start)}.${m.category === "infortunio" ? " Se il dolore peggiora, scrivimi pure." : ""}`
    : `Ciao ${first(c.name)}, ${u.name} ha ricevuto il tuo messaggio. Ne parlerete al prossimo appuntamento.`;
  m.status = "added";
  m.answers.push({ date: new Date().toISOString(), from: "segretaria", text: answer });
  await saveMsg(u.id, m);
  await tellClient(u, c, answer);
  return `Fatto. L'ho aggiunto alla scheda di ${c.name} e gli ho scritto: "${answer}"`;
}

/** Il professionista risponde lui: la risposta arriva al cliente. */
export async function decideReply(u: User, msgId: string, reply: string): Promise<string> {
  const m = await getMsg(u.id, msgId);
  if (!m) return "Non trovo più questo messaggio.";
  const c = await getClient(u.id, m.clientId);
  if (!c) return "Non trovo più questo cliente.";
  m.status = "replied";
  m.answers.push({ date: new Date().toISOString(), from: "professionista", text: reply.trim() });
  await saveMsg(u.id, m);
  if (m.category === "infortunio") {
    c.warnings.push({ date: m.createdAt, text: m.text, source: "cliente" });
    await saveClient(u.id, c);
  }
  await tellClient(u, c, `${u.name}: ${reply.trim()}`);
  return `Risposta inviata a ${c.name}.${m.category === "infortunio" ? " Ho segnato anche l'infortunio nella scheda." : ""}`;
}

/** Messaggi arrivati durante l'orario di riposo: li passo al professionista quando finisce. */
async function deliverQuietMessages(u: User) {
  const all = await import("./store").then((s) => s.listMsgs(u.id));
  const waiting = all.filter((m) => m.status === "new" && !(m as Msg & { delivered?: boolean }).delivered);
  for (const m of waiting) {
    const c = await getClient(u.id, m.clientId);
    if (!c) continue;
    await notifyNewMsg(u, c, m);
    await saveMsg(u.id, { ...m, delivered: true } as Msg);
  }
}

// ---------- Note a voce ----------
export async function voiceNote(u: User, c: Client, transcript: string): Promise<string> {
  const text = transcript.trim();
  if (!text) return "Non ho sentito niente, riprova.";
  const r = recipe(u.profession);
  type Out = { nota: string; peso?: number | null; attenzione?: string | null; campi?: Record<string, string> };
  const raw = await tryAsk(
    `Sei la segretaria di un ${r.name.toLowerCase()}. Ricevi una nota dettata a voce dopo un appuntamento con il cliente ${c.name}. ` +
      `Rispondi SOLO con un JSON: {"nota": "riassunto chiaro in 1-2 frasi in italiano", "peso": numero in kg o null, "attenzione": "nuovo infortunio/allergia/problema da ricordare" o null, "campi": {chiave: valore} solo se la nota cambia uno di questi campi: ${r.fields.map((f) => `${f.key} (${f.label})`).join(", ")}}. Non inventare niente.`,
    text,
    1500,
  );
  let out: Out = { nota: text };
  if (raw) {
    try {
      out = { ...out, ...parseJson<Out>(raw) };
    } catch {
      /* tengo la nota così com'è */
    }
  }
  const now = new Date().toISOString();
  const added: string[] = [];
  c.notes.push({ date: now, text: out.nota || text, source: "voce" });
  added.push(`nota: "${out.nota || text}"`);
  if (r.tracksWeight && typeof out.peso === "number" && out.peso > 20 && out.peso < 400) {
    c.weights.push({ date: now, kg: Math.round(out.peso * 10) / 10 });
    added.push(`peso: ${out.peso} kg`);
  }
  if (out.attenzione) {
    c.warnings.push({ date: now, text: out.attenzione, source: "voce" });
    added.push(`attenzione: ${out.attenzione}`);
  }
  for (const [k, v] of Object.entries(out.campi || {})) {
    const f = r.fields.find((x) => x.key === k);
    if (f && v) {
      c.fields[k] = String(v);
      added.push(`${f.label.toLowerCase()}: ${v}`);
    }
  }
  await saveClient(u.id, c);
  return "Ho aggiunto alla scheda: " + added.join(" · ");
}

// ---------- Appuntamento fatto / non venuto: pacchetti ----------
export async function setApptStatus(u: User, apptId: string, status: Appt["status"]): Promise<string> {
  const a = await getAppt(u.id, apptId);
  if (!a) return "Appuntamento non trovato.";
  const c = await getClient(u.id, a.clientId);
  const wasCounted = a.status === "done" || a.status === "noshow";
  a.status = status;
  await saveAppt(u.id, a);
  if (!c || !c.pkg) return "Salvato.";
  const counts = status === "done" || status === "noshow";
  if (counts && !wasCounted) c.pkg.used = Math.min(c.pkg.total, c.pkg.used + 1);
  if (!counts && wasCounted) c.pkg.used = Math.max(0, c.pkg.used - 1);
  const rem = c.pkg.total - c.pkg.used;
  let extra = "";
  if (rem <= 2 && !c.pkg.renewAsked) {
    c.pkg.renewAsked = true;
    const wa = `Ciao ${first(c.name)}! Ti restano ${rem} ${rem === 1 ? "lezione" : "lezioni"} del pacchetto. Vuoi che ti prepari il prossimo da ${c.pkg.total}${c.pkg.price ? ` (${c.pkg.price} CHF)` : ""}? Così non perdiamo il ritmo 💪`;
    await tellPro(u, `💳 A ${c.name} restano ${rem} ${rem === 1 ? "lezione" : "lezioni"} del pacchetto.\nVuoi proporgli il rinnovo? Ho già scritto il messaggio, devi solo premere Invia:`, [
      [{ text: "Proponi rinnovo su WhatsApp", url: whatsappLink(wa, c.phone) }],
    ]);
    extra = ` Restano ${rem} lezioni: ti ho preparato il messaggio per il rinnovo.`;
  }
  await saveClient(u.id, c);
  return `Salvato.${extra}`;
}

// ---------- Il cliente conferma o chiede di spostare ----------
export async function clientConfirm(u: User, c: Client, apptId: string, answer: "yes" | "move"): Promise<string> {
  const a = await getAppt(u.id, apptId);
  if (!a || a.clientId !== c.id || a.status !== "planned") return "Questo appuntamento non è più disponibile.";
  a.confirm = answer;
  await saveAppt(u.id, a);
  const when = `${dayLabel(a.start)} alle ${fmtTime(a.start)}`;
  if (answer === "yes") {
    await tellPro(u, `✅ ${c.name} ha confermato: ${when}.`);
    return `Perfetto ${first(c.name)}, ci vediamo ${when}!`;
  }
  const waiting = (await listClients(u.id)).filter((x) => x.waitlist && x.id !== c.id);
  const rows = waiting.slice(0, 3).map((w) => [
    { text: `Offri il posto a ${w.name}`, url: whatsappLink(`Ciao ${first(w.name)}! Si è liberato un posto ${when}. Ti va bene?`, w.phone) },
  ]);
  await tellPro(
    u,
    `🔁 ${c.name} chiede di spostare l'appuntamento di ${when}.\nRispondigli tu per trovare un nuovo orario.${waiting.length ? "\n\nIn lista d'attesa c'è chi vorrebbe quel posto:" : ""}`,
    [[{ text: `Scrivi a ${first(c.name)} su WhatsApp`, url: whatsappLink(`Ciao ${first(c.name)}, nessun problema! Quando ti andrebbe bene?`, c.phone) }], ...rows],
  );
  return `Va bene ${first(c.name)}, ho avvisato ${u.name}: ti scrive lui per trovare un nuovo orario.`;
}

// ---------- Il lavoro automatico (ogni 5 minuti) ----------
export async function tick(): Promise<string[]> {
  const log: string[] = [];
  const now = Date.now();
  for (const u of await allUsers()) {
    if (!u.profession) continue;
    const [appts, clients, msgs] = await Promise.all([listAppts(u.id), listClients(u.id), import("./store").then((s) => s.listMsgs(u.id))]);
    const byId = new Map(clients.map((c) => [c.id, c]));

    // 1) Promemoria circa 30 minuti prima (il controllo gira ogni 5 minuti)
    for (const a of appts) {
      if (a.status !== "planned" || a.reminded) continue;
      const mins = (new Date(a.start).getTime() - now) / 60000;
      if (mins < 0 || mins > 32) continue;
      const c = byId.get(a.clientId);
      if (!c) continue;
      a.reminded = true;
      await saveAppt(u.id, a);
      const sent = await tellPro(u, await reminderText(u, a, c, msgs), [[{ text: "Apri la scheda", url: `${appUrl()}/clienti/${c.id}` }]]);
      log.push(`${u.email}: promemoria ${c.name} ${sent ? "mandato" : "(Telegram non collegato)"}`);
    }

    // 2) Conferma del giorno prima (dalle 17:00): email al cliente, riepilogo al professionista
    if (nowHHMM() >= "17:00") {
      const tomorrow = addDays(localDay(), 1);
      const toAsk = appts.filter((a) => a.status === "planned" && !a.confirmAsked && localDay(a.start) === tomorrow);
      const noEmail: Button2[] = [];
      for (const a of toAsk) {
        const c = byId.get(a.clientId);
        if (!c) continue;
        a.confirmAsked = true;
        await saveAppt(u.id, a);
        const text = `Ciao ${first(c.name)}! Ti ricordo l'appuntamento con ${u.name} domani alle ${fmtTime(a.start)}${a.place ? ` (${a.place})` : ""}. Ci sei? Conferma o chiedi di spostarlo qui: ${clientLink(c.token)}`;
        const ok = c.email ? await sendEmail(c.email, `Domani alle ${fmtTime(a.start)} con ${u.name}`, text, `Segretaria di ${u.name}`) : false;
        if (!ok) noEmail.push({ text: `Chiedi a ${c.name} (${fmtTime(a.start)})`, url: whatsappLink(text, c.phone) });
      }
      if (toAsk.length) {
        await tellPro(
          u,
          `📅 Domani hai ${toAsk.length} ${toAsk.length === 1 ? "appuntamento" : "appuntamenti"}. ` +
            (noEmail.length ? `Ho chiesto conferma per email a chi ce l'ha. Per gli altri ho preparato il messaggio WhatsApp:` : "Ho chiesto conferma a tutti per email. Ti avviso se qualcuno vuole spostare."),
          noEmail.map((b) => [b]),
        );
        log.push(`${u.email}: conferme per domani ${toAsk.length}`);
      }
    }

    // 3) Fine dell'orario di riposo: passo i messaggi arrivati di notte
    if (!inQuiet(u.quietFrom, u.quietTo) && msgs.some((m) => m.status === "new")) await deliverQuietMessages(u);
  }
  return log;
}
type Button2 = { text: string; url: string };

// ---------- Collegamento Telegram ----------
export async function userByChat(chatId: number): Promise<User | null> {
  const uid = await get<string>("tg_chats", String(chatId));
  return uid ? get<User>("users", uid) : null;
}
export async function linkChat(u: User, chatId: number) {
  await put("tg_chats", String(chatId), u.id);
}
