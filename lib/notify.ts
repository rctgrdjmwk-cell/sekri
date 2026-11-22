// Come la segretaria raggiunge le persone: Telegram per il professionista, email per i clienti.
import crypto from "node:crypto";
import type { User } from "./types";

// ---------- Telegram (al professionista) ----------
const token = () => {
  const raw = process.env.TELEGRAM_BOT_TOKEN || "";
  return raw.match(/\d{5,}:[A-Za-z0-9_-]{20,}/)?.[0] || raw.trim();
};
export const telegramReady = () => Boolean(token());

export type Button = { text: string; data?: string; url?: string };

async function tg(method: string, body: Record<string, unknown>) {
  if (!telegramReady()) return null;
  const r = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

export async function sendTo(chatId: number, text: string, buttons?: Button[][]) {
  const parts = text.match(/[\s\S]{1,4000}/g) || [""];
  for (let i = 0; i < parts.length; i++) {
    const last = i === parts.length - 1;
    await tg("sendMessage", {
      chat_id: chatId,
      text: parts[i],
      reply_markup:
        last && buttons
          ? { inline_keyboard: buttons.map((row) => row.map((b) => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data }))) }
          : undefined,
    });
  }
}

/** Manda un messaggio al professionista, se ha collegato Telegram. */
export async function tellPro(u: User, text: string, buttons?: Button[][]): Promise<boolean> {
  if (!u.telegramChatId || !telegramReady()) return false;
  await sendTo(u.telegramChatId, text, buttons);
  return true;
}

export async function answerCallback(id: string, text?: string) {
  await tg("answerCallbackQuery", { callback_query_id: id, text });
}

export function webhookSecret(): string {
  return crypto.createHash("sha256").update("sekri-tg:" + token()).digest("hex").slice(0, 32);
}

export async function setWebhook(appUrl: string) {
  return tg("setWebhook", {
    url: `${appUrl.replace(/\/$/, "")}/api/telegram`,
    secret_token: webhookSecret(),
    allowed_updates: ["message", "callback_query"],
  });
}

export async function botUsername(): Promise<string | null> {
  try {
    const r = await tg("getMe", {});
    return r?.ok ? r.result.username : null;
  } catch {
    return null;
  }
}

// ---------- Email (ai clienti), tramite Brevo ----------
export const emailReady = () => Boolean(process.env.BREVO_API_KEY && process.env.SENDER_EMAIL);

export async function sendEmail(to: string, subject: string, text: string, fromName: string): Promise<boolean> {
  const key = process.env.BREVO_API_KEY?.trim();
  const from = process.env.SENDER_EMAIL?.trim();
  if (!key || !from || !to) return false;
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender: { email: from, name: fromName }, to: [{ email: to }], subject, textContent: text }),
  });
  if (!r.ok) console.error("brevo", await r.text());
  return r.ok;
}

// ---------- Link utili ----------
export function appUrl(): string {
  const u = process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return u.replace(/\/$/, "");
}

export const clientLink = (token: string) => `${appUrl()}/c/${token}`;

/** Apre WhatsApp con un messaggio già scritto (il professionista preme solo Invia). */
export function whatsappLink(text: string, phone?: string): string {
  const num = (phone || "").replace(/[^\d]/g, "").replace(/^00/, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
