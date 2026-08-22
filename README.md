# Nordic Fit

Hjemmeside til personlig træning — book 1 session eller et forløb.

## Kom i gang

```bash
npm install
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000).

## Sider

- `/` — Forside
- `/ydelser` — Session og forløb
- `/booking` — Booking (kalender + tider)
- `/om` — Om træneren
- `/faq` — Spørgsmål
- `/kontakt` — Kontakt

## Tilpasning

Ret navn, priser, adresse og kontakt i:

- `src/lib/utils.ts` — brand, email, telefon, adresse
- `src/lib/products.ts` — ydelser og priser
- `src/lib/availability.ts` — ledige tider

Bookinger gemmes i `data/bookings.json` (gitignored).

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Framer Motion
