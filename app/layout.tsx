import "./globals.css";
import type { Metadata, Viewport } from "next";
import { currentUser } from "@/lib/auth";
import { readFlash } from "@/lib/flash";
import { listMsgs } from "@/lib/store";
import Nav from "@/components/Nav";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "Sekri, la tua segretaria digitale",
  description: "Agenda, schede clienti e promemoria intelligenti per personal trainer",
  appleWebApp: { capable: true, title: "Sekri", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0f6e66",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
  const f = await readFlash();
  const unread = u?.profession ? (await listMsgs(u.id)).filter((m) => m.status === "new").length : 0;
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" />
      </head>
      <body>
        <header className="top">
          <a href={u ? "/oggi" : "/"} className="logo">
            <i aria-hidden="true">S</i>Sekri
          </a>
          {u && (
            <form action={logout}>
              <button>Esci</button>
            </form>
          )}
        </header>
        <main>
          {f && <div className={`flash ${f.kind === "err" ? "err" : ""}`}>{f.msg}</div>}
          {children}
        </main>
        {u?.profession && <Nav unread={unread} />}
      </body>
    </html>
  );
}
