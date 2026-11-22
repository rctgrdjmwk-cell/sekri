import { requireUser } from "@/lib/auth";
import { RECIPES } from "@/lib/professions";
import { chooseProfession } from "../actions";

export default async function Benvenuto() {
  const u = await requireUser({ needProfession: false });
  return (
    <>
      <div className="label">Passo 2 di 2</div>
      <h1>Ciao {u.name}, che lavoro fai?</h1>
      <p className="muted">La tua segretaria preparerà agenda e schede clienti giuste per te.</p>
      <form action={chooseProfession} className="list">
        {RECIPES.map((r) => (
          <button key={r.id} name="profession" value={r.id} className="item" style={{ background: "#fff", color: "var(--ink)", border: "1.5px solid var(--line)", justifyContent: "flex-start", textAlign: "left", minHeight: 72 }}>
            <span className="grow">
              <b style={{ display: "block", fontSize: 17 }}>{r.name}</b>
              <span className="sub">{r.desc}</span>
            </span>
            {!r.ready && <span className="pill gray">In arrivo</span>}
          </button>
        ))}
      </form>
      <div className="card warm">
        <div className="label warm">Non trovi il tuo lavoro?</div>
        <div className="small">Presto potrai aggiungerlo con l'aiuto della segretaria, e in regalo avrai 3 mesi gratis.</div>
      </div>
    </>
  );
}
