"use client";
import { useState } from "react";

export default function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          prompt("Copia questo link:", url);
        }
      }}
    >
      {done ? "Copiato!" : "Copia il link"}
    </button>
  );
}
