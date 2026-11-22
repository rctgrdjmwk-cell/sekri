// Il "cervello" della segretaria: tutte le chiamate a Claude passano da qui.
// Senza chiave ANTHROPIC_API_KEY l'app funziona lo stesso, solo senza i consigli intelligenti.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";
let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export const hasAI = () => Boolean(process.env.ANTHROPIC_API_KEY);

export async function ask(system: string, prompt: string, maxTokens = 4000): Promise<string> {
  if (!hasAI()) throw new Error("Manca la chiave ANTHROPIC_API_KEY.");
  const res = await getClient()
    .beta.messages.stream({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    })
    .finalMessage();
  if (res.stop_reason === "refusal") throw new Error("La segretaria non ha potuto elaborare questa richiesta.");
  return res.content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Estrae un JSON dalla risposta (anche se è dentro ```json ... ```). */
export function parseJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.search(/[\[{]/);
  const end = Math.max(raw.lastIndexOf("]"), raw.lastIndexOf("}"));
  if (start < 0 || end < start) throw new Error("Risposta non valida dall'AI.");
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

/** Prova a chiedere all'AI; se non c'è la chiave o qualcosa va storto, restituisce null. */
export async function tryAsk(system: string, prompt: string, maxTokens?: number): Promise<string | null> {
  if (!hasAI()) return null;
  try {
    return await ask(system, prompt, maxTokens);
  } catch (e) {
    console.error("ai", e);
    return null;
  }
}
