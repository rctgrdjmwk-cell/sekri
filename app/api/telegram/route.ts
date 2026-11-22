// Il bot di Telegram: collega il professionista e riceve le sue scelte sui messaggi dei clienti.
import { after } from "next/server";
import { all } from "@/lib/db";
import { saveUser } from "@/lib/auth";
import { answerCallback, sendTo, webhookSecret } from "@/lib/notify";
import { decideAdd, decideReply, linkChat, userByChat } from "@/lib/secretary";
import { getClient, getMsg } from "@/lib/store";
import type { User } from "@/lib/types";

export const maxDuration = 120;

type Update = {
  message?: { chat: { id: number }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number } } };
};

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret()) return new Response("no", { status: 401 });
  const update = (await req.json()) as Update;
  after(() => handle(update).catch((e) => console.error("telegram", e)));
  return Response.json({ ok: true });
}

async function handle(up: Update) {
  if (up.callback_query) {
    const q = up.callback_query;
    const chatId = q.message?.chat.id;
    const u = chatId ? await userByChat(chatId) : null;
    if (!u || !chatId) return answerCallback(q.id, "Non ti riconosco");
    const [action, msgId] = (q.data || "").split(":");
    if (action === "ad") {
      await answerCallback(q.id, "Fatto");
      await sendTo(chatId, await decideAdd(u, msgId));
    } else if (action === "rp") {
      const m = await getMsg(u.id, msgId);
      const c = m ? await getClient(u.id, m.clientId) : null;
      if (!m || !c) return answerCallback(q.id, "Non lo trovo più");
      await saveUser({ ...u, pendingReply: { clientId: c.id, msgId } });
      await answerCallback(q.id);
      await sendTo(chatId, `Scrivi qui sotto la risposta per ${c.name}: gliela mando io. ✍️`);
    }
    return;
  }

  const msg = up.message;
  if (!msg) return;
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  if (text.startsWith("/start")) {
    const code = text.replace("/start", "").trim();
    const users = code ? await all<User>("users") : [];
    const u = users.find((x) => x.linkCode === code);
    if (!u) {
      await sendTo(chatId, "Ciao! Per collegarmi apri Sekri, vai su Profilo e tocca \"Collega Telegram\".");
      return;
    }
    await saveUser({ ...u, telegramChatId: chatId });
    await linkChat(u, chatId);
    await sendTo(chatId, `Ciao ${u.name}, sono la tua segretaria! 👋\nDa ora ti scrivo qui: promemoria 30 minuti prima di ogni cliente, messaggi dei clienti e conferme.`);
    return;
  }

  const u = await userByChat(chatId);
  if (!u) {
    await sendTo(chatId, "Non ti conosco ancora. Apri Sekri, vai su Profilo e tocca \"Collega Telegram\".");
    return;
  }
  if (u.pendingReply && text) {
    const { msgId } = u.pendingReply;
    await saveUser({ ...u, pendingReply: undefined });
    await sendTo(chatId, await decideReply(u, msgId, text));
    return;
  }
  await sendTo(chatId, "Ti scrivo io quando serve. 🙂 Per agenda e schede apri l'app Sekri.");
}
