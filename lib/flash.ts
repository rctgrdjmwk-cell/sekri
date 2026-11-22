import { cookies } from "next/headers";

export async function flash(msg: string, kind: "ok" | "err" = "ok") {
  (await cookies()).set("flash", JSON.stringify({ msg, kind }), { maxAge: 8, path: "/" });
}

export async function readFlash(): Promise<{ msg: string; kind: string } | null> {
  const c = (await cookies()).get("flash")?.value;
  if (!c) return null;
  try {
    return JSON.parse(c);
  } catch {
    return null;
  }
}
