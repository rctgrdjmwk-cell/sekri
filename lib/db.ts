// Database di Sekri: usa Upstash Redis online, oppure un file locale per le prove.
import { Redis } from "@upstash/redis";
import fs from "node:fs";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

const LOCAL_FILE = "data.local.json";
type LocalData = Record<string, Record<string, unknown>>;
function readLocal(): LocalData {
  try {
    return JSON.parse(fs.readFileSync(LOCAL_FILE, "utf8"));
  } catch {
    return {};
  }
}
function writeLocal(d: LocalData) {
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(d, null, 2));
}

export async function put<T>(collection: string, id: string, value: T): Promise<void> {
  if (redis) {
    await redis.hset(collection, { [id]: JSON.stringify(value) });
    return;
  }
  const d = readLocal();
  d[collection] = { ...(d[collection] || {}), [id]: value };
  writeLocal(d);
}

export async function get<T>(collection: string, id: string): Promise<T | null> {
  if (redis) {
    const v = await redis.hget<T | string>(collection, id);
    if (v == null) return null;
    return decode<T>(v);
  }
  return ((readLocal()[collection] || {})[id] as T) ?? null;
}

export async function all<T>(collection: string): Promise<T[]> {
  if (redis) {
    const h = await redis.hgetall<Record<string, T | string>>(collection);
    if (!h) return [];
    return Object.values(h).map((v) => decode<T>(v));
  }
  return Object.values(readLocal()[collection] || {}) as T[];
}

export async function remove(collection: string, id: string): Promise<void> {
  if (redis) {
    await redis.hdel(collection, id);
    return;
  }
  const d = readLocal();
  if (d[collection]) delete d[collection][id];
  writeLocal(d);
}

function decode<T>(v: unknown): T {
  if (typeof v !== "string") return v as T;
  try {
    return JSON.parse(v) as T;
  } catch {
    return v as T;
  }
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Un token lungo e difficile da indovinare (per i link dei clienti). */
export function newToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}
