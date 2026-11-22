// Il controllo automatico: da chiamare ogni 5 minuti (es. con cron-job.org) con ?key=CRON_SECRET
import { tick } from "@/lib/secretary";

export const maxDuration = 300;

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key") || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) return new Response("no", { status: 401 });
  const log = await tick();
  return Response.json({ ok: true, log });
}
