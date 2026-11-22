# Sekri, la segretaria digitale

Sekri aiuta i professionisti che lavorano da soli (per ora i **personal trainer**) a gestire agenda e clienti come se avessero una segretaria vera.

## Cosa fa

- **Agenda e schede clienti** con i campi giusti per la professione (obiettivo, peso, livello, infortuni, note).
- **Promemoria 30 minuti prima** su Telegram, con la scheda del cliente in breve e un consiglio della segretaria.
- **Il cliente scrive alla segretaria** da un link personale, senza scaricare app. La segretaria risponde "ho passato il messaggio" e non promette niente.
- **Il professionista decide**: "Rispondo io adesso" oppure "Aggiungi alla scheda, ne parliamo al prossimo appuntamento". Nel secondo caso la segretaria avvisa il cliente.
- **Note a voce** dopo l'allenamento: il professionista parla, la scheda si compila da sola (peso, note, nuove attenzioni).
- **Conferma del giorno prima**: dalle 17:00 la segretaria chiede conferma ai clienti di domani (email, oppure messaggio WhatsApp già pronto). Se qualcuno sposta, propone il posto a chi è in lista d'attesa.
- **Pacchetti di lezioni**: conta le lezioni e, quando ne restano 2, prepara il messaggio per il rinnovo.
- **Consigli**: clienti che non vengono da 3 settimane, pacchetti in scadenza, messaggi da decidere.
- **Orario di riposo**: di sera la segretaria non disturba e passa i messaggi la mattina dopo.

## Le professioni sono "ricette"

Ogni professione è descritta in `lib/professions.ts` (quali campi ha la scheda, come si chiama l'appuntamento, ecc.).
Per aggiungerne una basta scrivere una ricetta nuova e metterla `ready: true`. Parrucchiere ed estetista sono già preparati ma "in arrivo".

## Messa online (Vercel)

1. Su Vercel: **Add New → Project**, scegli il repository `sekri`, premi **Deploy**.
2. Su Vercel → progetto → **Storage**: collega un database **Upstash Redis** (lo stesso tipo usato da Jarvis).
3. Su Vercel → **Settings → Environment Variables** (Production) aggiungi:

| Nome | Cosa mettere |
|---|---|
| `SESSION_SECRET` | una frase lunga a caso (serve a proteggere gli accessi) |
| `CRON_SECRET` | un'altra parola segreta (per i controlli automatici) |
| `ADMIN_EMAIL` | la tua email: vedrai la sezione "Gestione del sito" nel Profilo |
| `TELEGRAM_BOT_TOKEN` | il token di un bot **nuovo** creato con @BotFather (non quello di Jarvis) |
| `ANTHROPIC_API_KEY` | facoltativa: consigli e note a voce intelligenti |
| `BREVO_API_KEY`, `SENDER_EMAIL` | facoltative: email automatiche ai clienti |
| `APP_URL` | l'indirizzo del sito, es. `https://sekri.vercel.app` |

4. **Redeploy**.
5. Registrati sul sito con la tua `ADMIN_EMAIL`, vai su **Profilo → Attiva il bot di Telegram**, poi **Collega Telegram**.
6. Su [cron-job.org](https://cron-job.org) crea un controllo **ogni 5 minuti** su:
   `https://IL-TUO-INDIRIZZO/api/cron?key=CRON_SECRET`

## Per sviluppare

```bash
npm install
npm run dev
```

Senza Redis i dati finiscono in `data.local.json` (solo per le prove).
