// Lettura e scrittura di clienti, appuntamenti e messaggi (ogni professionista ha i suoi).
import { all, get, newId, newToken, put, remove } from "./db";
import type { Appt, Client, Msg, User } from "./types";

const C = (uid: string) => `clients:${uid}`;
const A = (uid: string) => `appts:${uid}`;
const M = (uid: string) => `msgs:${uid}`;

// ---------- Clienti ----------
export async function listClients(uid: string): Promise<Client[]> {
  return (await all<Client>(C(uid))).sort((a, b) => a.name.localeCompare(b.name, "it"));
}
export const getClient = (uid: string, id: string) => get<Client>(C(uid), id);
export const saveClient = (uid: string, c: Client) => put(C(uid), c.id, c);

export async function createClient(uid: string, name: string, email?: string, phone?: string): Promise<Client> {
  const c: Client = {
    id: newId(),
    name: name.trim(),
    email: email?.trim() || undefined,
    phone: phone?.trim() || undefined,
    token: newToken(),
    fields: {},
    weights: [],
    warnings: [],
    notes: [],
    createdAt: new Date().toISOString(),
  };
  await saveClient(uid, c);
  await put("client_links", c.token, { uid, cid: c.id });
  return c;
}

export async function deleteClient(uid: string, id: string) {
  const c = await getClient(uid, id);
  if (c) await remove("client_links", c.token);
  await remove(C(uid), id);
  for (const a of await listAppts(uid)) if (a.clientId === id) await remove(A(uid), a.id);
  for (const m of await listMsgs(uid)) if (m.clientId === id) await remove(M(uid), m.id);
}

/** Dal link del cliente risale al professionista e al cliente. */
export async function byToken(token: string): Promise<{ user: User; client: Client } | null> {
  const link = await get<{ uid: string; cid: string }>("client_links", token);
  if (!link) return null;
  const [user, client] = await Promise.all([get<User>("users", link.uid), getClient(link.uid, link.cid)]);
  return user && client ? { user, client } : null;
}

// ---------- Appuntamenti ----------
export async function listAppts(uid: string): Promise<Appt[]> {
  return (await all<Appt>(A(uid))).sort((a, b) => a.start.localeCompare(b.start));
}
export const getAppt = (uid: string, id: string) => get<Appt>(A(uid), id);
export const saveAppt = (uid: string, a: Appt) => put(A(uid), a.id, a);
export const deleteAppt = (uid: string, id: string) => remove(A(uid), id);

export async function createAppt(uid: string, a: Omit<Appt, "id" | "status">): Promise<Appt> {
  const appt: Appt = { ...a, id: newId(), status: "planned" };
  await saveAppt(uid, appt);
  return appt;
}

export async function nextApptFor(uid: string, clientId: string): Promise<Appt | undefined> {
  const now = new Date().toISOString();
  return (await listAppts(uid)).find((a) => a.clientId === clientId && a.status === "planned" && a.start >= now);
}

export async function lastApptFor(uid: string, clientId: string): Promise<Appt | undefined> {
  const now = new Date().toISOString();
  return (await listAppts(uid)).filter((a) => a.clientId === clientId && a.start < now && a.status === "done").pop();
}

// ---------- Messaggi dei clienti ----------
export async function listMsgs(uid: string): Promise<Msg[]> {
  return (await all<Msg>(M(uid))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export const getMsg = (uid: string, id: string) => get<Msg>(M(uid), id);
export const saveMsg = (uid: string, m: Msg) => put(M(uid), m.id, m);

export async function allUsers(): Promise<User[]> {
  return all<User>("users");
}
