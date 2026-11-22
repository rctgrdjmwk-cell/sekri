"use client";
import { usePathname } from "next/navigation";

const items = [
  { href: "/oggi", label: "Oggi", d: "M3 10h18M8 3v4M16 3v4M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z" },
  { href: "/clienti", label: "Clienti", d: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 000-6M22 21c0-3-2-5-4-5.5" },
  { href: "/agenda/nuovo", label: "Nuovo", d: "M12 5v14M5 12h14" },
  { href: "/messaggi", label: "Messaggi", d: "M4 5h16v11H8l-4 4V5z" },
  { href: "/impostazioni", label: "Profilo", d: "M12 15a3 3 0 100-6 3 3 0 000 6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" },
];

export default function Nav({ unread }: { unread: number }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Menu principale">
      {items.map((i) => (
        <a key={i.href} href={i.href} className={path.startsWith(i.href) ? "on" : ""} aria-current={path.startsWith(i.href) ? "page" : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={i.d} />
          </svg>
          {i.label}
          {i.href === "/messaggi" && unread > 0 && <span className="badge">{unread}</span>}
        </a>
      ))}
    </nav>
  );
}
