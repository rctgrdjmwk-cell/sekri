"use client";
// Nota a voce: il professionista parla, il telefono trascrive, la segretaria compila la scheda.
import { useRef, useState } from "react";
import { saveVoiceNote } from "@/app/actions";

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onend: () => void;
  onerror: () => void;
};

export default function VoiceNote({ clientId, hint }: { clientId: string; hint: string }) {
  const [text, setText] = useState("");
  const [rec, setRec] = useState(false);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState("");
  const ref = useRef<Rec | null>(null);

  function toggle() {
    if (rec) {
      ref.current?.stop();
      return;
    }
    const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      setOut("Questo browser non sa trascrivere la voce. Usa il microfono della tastiera e scrivi qui sotto.");
      return;
    }
    const r = new SR();
    r.lang = "it-IT";
    r.continuous = true;
    r.interimResults = true;
    const before = text ? text + " " : "";
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setText(before + t);
    };
    r.onend = () => setRec(false);
    r.onerror = () => setRec(false);
    ref.current = r;
    setOut("");
    setRec(true);
    r.start();
  }

  async function save() {
    setBusy(true);
    try {
      setOut(await saveVoiceNote(clientId, text));
      setText("");
    } catch {
      setOut("Qualcosa è andato storto, riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card soft">
      <div className="label">Nota a voce</div>
      <div className="muted small">{hint}</div>
      <button type="button" className={`mic ${rec ? "rec" : ""}`} onClick={toggle} aria-pressed={rec}>
        {rec ? "Sto ascoltando… tocca per fermare" : "🎙️ Tocca e parla"}
      </button>
      <label>
        Cosa ho capito
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Puoi anche scrivere qui" />
      </label>
      <button type="button" onClick={save} disabled={!text.trim() || busy}>
        {busy ? "La segretaria sta compilando…" : "Aggiungi alla scheda"}
      </button>
      {out && <div className="flash" role="status">{out}</div>}
    </div>
  );
}
