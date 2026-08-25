# Lukas Møller — Personlig træner

Hjemmeside til personlig træning i Viborg. Book en PT til 350 kr. eller send en forespørgsel om Online Coaching fra 799 kr./md.

## Kom i gang

```bash
npm install
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000). Brug `npm run dev -- -p 3001`, hvis port 3000 allerede er i brug.

## Sider

- `/` — Forside
- `/ydelser` — Personlig træning og Online Coaching
- `/booking` — Book PT (dato/tid) eller send Online Coaching-forespørgsel
- `/om` — Om træneren
- `/faq` — Spørgsmål
- `/kontakt` — Kontakt

## Tilpasning

Ret navn, priser, adresse og kontakt i:

- `src/lib/utils.ts` — brand, email, telefon, adresse
- `src/lib/products.ts` — ydelser og priser
- `src/lib/availability.ts` — ledige tider til PT

Booking og kontakt sendes via Resend. Uden `RESEND_API_KEY` returnerer formularerne 503 — der vises aldrig falsk success.

Valgfri PostgreSQL (`DATABASE_URL`): uden den sendes kun e-mail; med den gemmes bookinger og kontaktbeskeder også.

Kanonisk URL til sitemap, robots og Open Graph kommer kun fra `NEXT_PUBLIC_SITE_URL`.

Alle variabler står i `.env.example`.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Framer Motion · Resend · Prisma (valgfri)
