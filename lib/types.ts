// Le "forme" dei dati di Sekri.

export type ProfessionId = "personal_trainer" | "parrucchiere" | "estetista";

export interface User {
  id: string;
  email: string;
  name: string; // come lo chiamano i clienti, es. "Luca"
  passHash: string;
  salt: string;
  profession?: ProfessionId;
  createdAt: string;
  telegramChatId?: number;
  linkCode: string; // codice per collegare Telegram
  /** Se il professionista ha scelto "Rispondo io" su Telegram, il prossimo messaggio va al cliente. */
  pendingReply?: { clientId: string; msgId: string };
  /** Orario di riposo (es. "20:00" - "07:30"): la segretaria non disturba. */
  quietFrom?: string;
  quietTo?: string;
}

export interface Dated {
  date: string; // ISO
  text: string;
  source: "trainer" | "voce" | "cliente";
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  token: string; // per il link personale del cliente
  fields: Record<string, string>; // campi della "ricetta" della professione
  weights: { date: string; kg: number }[];
  warnings: Dated[]; // cose a cui fare attenzione (infortuni, allergie...)
  notes: Dated[];
  pkg?: { total: number; used: number; price?: number; startedAt: string; renewAsked?: boolean };
  waitlist?: boolean; // vuole un posto prima, se si libera
  createdAt: string;
}

export type ApptStatus = "planned" | "done" | "noshow" | "cancelled";

export interface Appt {
  id: string;
  clientId: string;
  start: string; // ISO in UTC
  minutes: number;
  place?: string;
  status: ApptStatus;
  reminded?: boolean; // promemoria 30 min prima mandato
  confirmAsked?: boolean; // conferma del giorno prima chiesta
  confirm?: "yes" | "move";
}

export type MsgCategory = "infortunio" | "esercizio" | "appuntamento" | "altro";

export interface Msg {
  id: string;
  clientId: string;
  category: MsgCategory;
  text: string;
  createdAt: string;
  status: "new" | "replied" | "added";
  /** Cosa ha ricevuto il cliente come risposta (dal professionista o dalla segretaria). */
  answers: { date: string; from: "segretaria" | "professionista"; text: string }[];
}
