import { requireUser } from "@/lib/auth";
import { listClients } from "@/lib/store";
import { localDay } from "@/lib/time";
import { addAppt } from "../../actions";

export default async function Nuovo({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const u = await requireUser();
  const { cliente } = await searchParams;
  const clients = await listClients(u.id);
  if (!clients.length)
    return (
      <>
        <h1>Nuovo appuntamento</h1>
        <div className="card soft">
          <div>Prima aggiungi almeno un cliente.</div>
          <a className="btn" href="/clienti">Aggiungi un cliente</a>
        </div>
      </>
    );
  return (
    <>
      <h1>Nuovo appuntamento</h1>
      <form action={addAppt} className="card">
        <label>
          Cliente
          <select name="clientId" defaultValue={cliente || ""} required>
            <option value="" disabled>Scegli…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="grid2">
          <label>Giorno<input name="day" type="date" defaultValue={localDay()} required /></label>
          <label>Ora<input name="time" type="time" defaultValue="09:00" required /></label>
        </div>
        <div className="grid2">
          <label>
            Durata
            <select name="minutes" defaultValue="60">
              {[30, 45, 60, 75, 90, 120].map((m) => <option key={m} value={m}>{m} minuti</option>)}
            </select>
          </label>
          <label>
            Ripeti ogni settimana
            <select name="weeks" defaultValue="1">
              <option value="1">No, solo questo</option>
              {[4, 8, 12].map((w) => <option key={w} value={w}>Per {w} settimane</option>)}
            </select>
          </label>
        </div>
        <label>Luogo (facoltativo)<input name="place" placeholder="es. Palestra centro, al parco, online" /></label>
        <button>Aggiungi in agenda</button>
      </form>
    </>
  );
}
