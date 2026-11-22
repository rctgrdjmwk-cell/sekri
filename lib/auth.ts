// Account dei professionisti: registrazione, accesso, sessione.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { get, put, newId } from "./db";
import type { User } from "./types";

const COOKIE = "sekri_session";
const secret = () => process.env.SESSION_SECRET || process.env.CRON_SECRET || "sekri-solo-per-prove-in-locale";

function hashPassword(pw: string, salt: string): string {
  return crypto.scryptSync(pw, salt, 64).toString("hex");
}

function sign(uid: string): string {
  return crypto.createHmac("sha256", secret()).update(uid).digest("hex").slice(0, 40);
}

export async function createUser(email: string, name: string, pw: string): Promise<User> {
  email = email.toLowerCase().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("L'email non sembra giusta.");
  if (pw.length < 8) throw new Error("La password deve avere almeno 8 caratteri.");
  if (!name.trim()) throw new Error("Scrivi il tuo nome.");
  if (await get<string>("users_by_email", email)) throw new Error("Esiste già un account con questa email. Prova ad accedere.");
  const salt = crypto.randomBytes(16).toString("hex");
  const user: User = {
    id: newId(),
    email,
    name: name.trim(),
    salt,
    passHash: hashPassword(pw, salt),
    createdAt: new Date().toISOString(),
    linkCode: crypto.randomBytes(6).toString("hex"),
  };
  await put("users", user.id, user);
  await put("users_by_email", email, user.id);
  return user;
}

export async function checkLogin(email: string, pw: string): Promise<User | null> {
  const id = await get<string>("users_by_email", email.toLowerCase().trim());
  if (!id) return null;
  const u = await get<User>("users", id);
  if (!u) return null;
  const ok = crypto.timingSafeEqual(Buffer.from(hashPassword(pw, u.salt), "hex"), Buffer.from(u.passHash, "hex"));
  return ok ? u : null;
}

export async function startSession(uid: string) {
  (await cookies()).set(COOKIE, `${uid}.${sign(uid)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return null;
  const [uid, sig] = v.split(".");
  if (!uid || !sig || sig.length !== 40) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(sign(uid)))) return null;
  return get<User>("users", uid);
}

/** Per le pagine riservate: se non sei entrato ti manda all'accesso. */
export async function requireUser(opts: { needProfession?: boolean } = { needProfession: true }): Promise<User> {
  const u = await currentUser();
  if (!u) redirect("/accedi");
  if (opts.needProfession !== false && !u.profession) redirect("/benvenuto");
  return u;
}

export async function saveUser(u: User) {
  await put("users", u.id, u);
}
