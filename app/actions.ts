"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkLogin, createUser, endSession, requireUser, saveUser, startSession } from "@/lib/auth";
import { flash } from "@/lib/flash";
import { RECIPES } from "@/lib/professions";
import { appUrl, setWebhook, telegramReady } from "@/lib/notify";
import { byToken, createAppt, createClient, deleteAppt, deleteClient as removeClient, getClient, saveClient } from "@/lib/store";
import { clientConfirm, clientWrites, decideAdd, decideReply, setApptStatus, voiceNote } from "@/lib/secretary";
import { addDays, toUTC } from "@/lib/time";
import type { MsgCategory, ProfessionId } from "@/lib/types";

const s = (f: FormData, k: string) => String(f.get(k) || "").trim();

async function guard<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // i redirect di Next passano
    await flash(e instanceof Error ? e.message : String(e), "err");
  }
}

// ---------- Account ----------
export async function register(f: FormData) {
  const u = await guard(() => createUser(s(f, "email"), s(f, "name"), s(f, "password")));
  if (!u) redirect("/registrati");
  await startSession(u.id);
  redirect("/benvenuto");
}

export async function login(f: FormData) {
  const u = await checkLogin(s(f, "email"), s(f, "password"));
  if (!u) {
    await flash("Email o password sbagliata.", "err");
    redirect("/accedi");
  }
  await startSession(u.id);
  redirect("/oggi");
}

export async function logout() {
  await endSession();
  redirect("/");
}

export async function chooseProfession(f: FormData) {
  const u = await requireUser({ needProfession: false });
  const id = s(f, "profession") as ProfessionId;
  const r = RECIPES.find((x) => x.id === id);
  if (!r) redirect("/benvenuto");
  if (!r.ready) {
    await flash(`${r.name} arriva presto! Per ora Sekri è pronto per i personal trainer.`, "err");
    redirect("/benvenuto");
  }
  await saveUser({ ...u, profession: id });
  await flash(`Benvenuto ${u.name}! Inizia aggiungendo il tuo primo cliente.`);
  redirect("/oggi");
}

export async function saveSettings(f: FormData) {
  const u = await requireUser();
  const quietFrom = s(f, "quietFrom");
  const quietTo = s(f, "quietTo");
  await saveUser({ ...u, name: s(f, "name") || u.name, quietFrom: quietFrom || undefined, quietTo: quietTo || undefined });
  await flash("Salvato.");
  revalidatePath("/impostazioni");
}

export async function activateBot() {
  await requireUser();
  if (!telegramReady()) {
    await flash("Manca TELEGRAM_BOT_TOKEN nelle impostazioni di Vercel.", "err");
  } else {
    const r = await setWebhook(appUrl());
    await flash(r?.ok ? "Bot di Telegram attivato." : "Telegram ha risposto: " + (r?.description || "errore"), r?.ok ? "ok" : "err");
  }
  revalidatePath("/impostazioni");
}

// ---------- Clienti ----------
export async function addClient(f: FormData) {
  const u = await requireUser();
  if (!s(f, "name")) {
    await flash("Scrivi il nome del cliente.", "err");
    redirect("/clienti");
  }
  const c = await createClient(u.id, s(f, "name"), s(f, "email"), s(f, "phone"));
  redirect(`/clienti/${c.id}?nuovo=1`);
}

async function withClient(f: FormData, fn: (c: NonNullable<Awaited<ReturnType<typeof getClient>>>, uid: string) => void | string) {
  const u = await requireUser();
  const c = await getClient(u.id, s(f, "clientId"));
  if (!c) return;
  const msg = fn(c, u.id);
  await saveClient(u.id, c);
  if (msg) await flash(msg);
  revalidatePath(`/clienti/${c.id}`);
}

export async function updateClient(f: FormData) {
  await withClient(f, (c) => {
    c.name = s(f, "name") || c.name;
    c.email = s(f, "email") || undefined;
    c.phone = s(f, "phone") || undefined;
    c.waitlist = f.get("waitlist") === "on";
    for (const [k, v] of f.entries()) if (k.startsWith("field_")) c.fields[k.slice(6)] = String(v).trim();
    return "Scheda salvata.";
  });
}

export async function addWeight(f: FormData) {
  await withClient(f, (c) => {
    const kg = Number(s(f, "kg").replace(",", "."));
    if (!(kg > 20 && kg < 400)) return "Peso non valido.";
    c.weights.push({ date: new Date().toISOString(), kg: Math.round(kg * 10) / 10 });
    return "Peso aggiunto.";
  });
}

export async function addWarning(f: FormData) {
  await withClient(f, (c) => {
    if (s(f, "text")) c.warnings.push({ date: new Date().toISOString(), text: s(f, "text"), source: "trainer" });
  });
}

export async function removeWarning(f: FormData) {
  await withClient(f, (c) => {
    c.warnings.splice(Number(s(f, "i")), 1);
    return "Tolto: non è più un problema.";
  });
}

export async function addNote(f: FormData) {
  await withClient(f, (c) => {
    if (s(f, "text")) c.notes.push({ date: new Date().toISOString(), text: s(f, "text"), source: "trainer" });
  });
}

export async function setPackage(f: FormData) {
  await withClient(f, (c) => {
    const total = Number(s(f, "total"));
    if (!total) {
      c.pkg = undefined;
      return "Pacchetto tolto.";
    }
    const price = Number(s(f, "price")) || undefined;
    c.pkg = { total, used: 0, price, startedAt: new Date().toISOString() };
    return `Nuovo pacchetto da ${total} lezioni.`;
  });
}

export async function deleteClient(f: FormData) {
  const u = await requireUser();
  await removeClient(u.id, s(f, "clientId"));
  await flash("Cliente eliminato.");
  redirect("/clienti");
}

export async function saveVoiceNote(clientId: string, transcript: string): Promise<string> {
  const u = await requireUser();
  const c = await getClient(u.id, clientId);
  if (!c) return "Cliente non trovato.";
  const out = await voiceNote(u, c, transcript);
  revalidatePath(`/clienti/${clientId}`);
  return out;
}

// ---------- Agenda ----------
export async function addAppt(f: FormData) {
  const u = await requireUser();
  const clientId = s(f, "clientId");
  const day = s(f, "day");
  const time = s(f, "time");
  if (!clientId || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) {
    await flash("Scegli cliente, giorno e ora.", "err");
    redirect("/agenda/nuovo");
  }
  const weeks = Math.min(26, Math.max(1, Number(s(f, "weeks")) || 1));
  for (let i = 0; i < weeks; i++) {
    await createAppt(u.id, {
      clientId,
      start: toUTC(addDays(day, i * 7), time),
      minutes: Number(s(f, "minutes")) || 60,
      place: s(f, "place") || undefined,
    });
  }
  await flash(weeks > 1 ? `Aggiunti ${weeks} appuntamenti, uno a settimana.` : "Appuntamento aggiunto.");
  redirect("/oggi");
}

export async function setStatus(f: FormData) {
  const u = await requireUser();
  const msg = await setApptStatus(u, s(f, "apptId"), s(f, "status") as "done" | "noshow" | "cancelled" | "planned");
  await flash(msg);
  revalidatePath("/oggi");
  revalidatePath(`/appuntamento/${s(f, "apptId")}`);
}

export async function removeAppt(f: FormData) {
  const u = await requireUser();
  await deleteAppt(u.id, s(f, "apptId"));
  await flash("Appuntamento eliminato.");
  redirect("/oggi");
}

// ---------- Messaggi ----------
export async function msgAdd(f: FormData) {
  const u = await requireUser();
  await flash(await decideAdd(u, s(f, "msgId")));
  revalidatePath("/messaggi");
}

export async function msgReply(f: FormData) {
  const u = await requireUser();
  if (!s(f, "reply")) {
    await flash("Scrivi la risposta.", "err");
  } else {
    await flash(await decideReply(u, s(f, "msgId"), s(f, "reply")));
  }
  revalidatePath("/messaggi");
}

// ---------- Pagina del cliente (senza account) ----------
export async function clientSend(f: FormData) {
  const token = s(f, "token");
  const found = await byToken(token);
  if (!found) redirect("/");
  const text = s(f, "text");
  if (text) await clientWrites(found.user, found.client, (s(f, "category") || "altro") as MsgCategory, text);
  redirect(`/c/${token}`);
}

export async function clientAnswer(f: FormData) {
  const token = s(f, "token");
  const found = await byToken(token);
  if (!found) redirect("/");
  const out = await clientConfirm(found.user, found.client, s(f, "apptId"), s(f, "answer") === "yes" ? "yes" : "move");
  await flash(out);
  redirect(`/c/${token}`);
}

