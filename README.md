# Lukas Møller — Personlig træner

Hjemmeside til personlig træning i Viborg. Book en PT til 350 kr. eller send en forespørgsel om Online Coaching fra 799 kr./md.

## Kom i gang

```bash
npm install
npm run dev -- -p 3001
```

Åbn [http://localhost:3001](http://localhost:3001).

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

Booking og kontakt sendes via Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `BOOKINGS_NOTIFY_EMAIL`).

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Framer Motion
