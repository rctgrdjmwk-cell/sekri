// Le "ricette" delle professioni: ogni professione dice quali campi ha la scheda cliente.
// Aggiungere una professione = aggiungere una ricetta qui, senza toccare il resto dell'app.
import type { ProfessionId } from "./types";

export interface Field {
  key: string;
  label: string;
  placeholder?: string;
  options?: string[];
}

export interface Recipe {
  id: ProfessionId;
  name: string;
  desc: string;
  ready: boolean; // false = "in arrivo"
  clientWord: string; // come si chiama l'appuntamento
  fields: Field[];
  tracksWeight: boolean;
  warningLabel: string;
  voiceHint: string;
}

export const RECIPES: Recipe[] = [
  {
    id: "personal_trainer",
    name: "Personal trainer",
    desc: "Allenamenti, peso, progressi, infortuni",
    ready: true,
    clientWord: "allenamento",
    fields: [
      { key: "obiettivo", label: "Obiettivo", placeholder: "es. -5 kg entro marzo" },
      { key: "altezza", label: "Altezza", placeholder: "es. 1,80 m" },
      { key: "livello", label: "Livello", options: ["Principiante", "Intermedio", "Avanzato"] },
      { key: "frequenza", label: "Quante volte a settimana", placeholder: "es. 2" },
      { key: "preferenze", label: "Preferenze", placeholder: "es. ama il corpo libero, odia il tapis roulant" },
    ],
    tracksWeight: true,
    warningLabel: "Infortuni e attenzioni",
    voiceHint: "Es: \"Marco oggi squat 4 per 10 con 62 chili, un po' stanco, la caviglia va meglio. Pesa 83 e mezzo.\"",
  },
  {
    id: "parrucchiere",
    name: "Parrucchiere / barbiere",
    desc: "Taglio, formula del colore, prodotti",
    ready: false,
    clientWord: "appuntamento",
    fields: [
      { key: "capelli", label: "Tipo di capelli" },
      { key: "colore", label: "Colore base" },
      { key: "formula", label: "Formula del colore" },
      { key: "prodotti", label: "Prodotti usati" },
    ],
    tracksWeight: false,
    warningLabel: "Allergie e attenzioni",
    voiceHint: "Es: \"Laura radici 5.3 con 20 volumi, taglio punte 3 centimetri.\"",
  },
  {
    id: "estetista",
    name: "Estetista / massaggiatore",
    desc: "Trattamenti, tipo di pelle, zone trattate",
    ready: false,
    clientWord: "trattamento",
    fields: [
      { key: "pelle", label: "Tipo di pelle" },
      { key: "trattamento", label: "Trattamento abituale" },
      { key: "zone", label: "Zone da trattare" },
      { key: "pressione", label: "Pressione preferita", options: ["Leggera", "Media", "Forte"] },
    ],
    tracksWeight: false,
    warningLabel: "Allergie e attenzioni",
    voiceHint: "Es: \"Giulia massaggio schiena 50 minuti, tensione a sinistra.\"",
  },
];

export function recipe(id?: ProfessionId): Recipe {
  return RECIPES.find((r) => r.id === id) || RECIPES[0];
}
