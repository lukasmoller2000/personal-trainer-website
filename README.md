# Lukas Møller — Personlig træner

Hjemmeside til personlig træning i Viborg. Book en PT til 350 kr. eller send en forespørgsel om Online Coaching fra 799 kr./md.

## Kom i gang

```bash
npm install
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000). Brug `npm run dev -- -p 3001`, hvis port 3000 allerede er i brug.

Kopiér `.env.example` til `.env.local` og udfyld nøglerne nedenfor, når du vil sende rigtig mail.

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

## Miljøvariabler

Alle navne står i `.env.example`. Koden læser kun disse:

| Variabel | Påkrævet live? | Bruges til |
|---|---|---|
| `RESEND_API_KEY` | Ja, ellers 503 på formularer | Booking + kontakt-mail |
| `NEXT_PUBLIC_SITE_URL` | Ja til SEO | `metadataBase`, sitemap, robots, Open Graph |
| `DATABASE_URL` | Nej | Valgfri PostgreSQL til bookinger/beskeder |
| `BOOKINGS_NOTIFY_EMAIL` | Nej | TO-adresse (default: `lukasmoller2000@gmail.com`) |
| `RESEND_FROM_EMAIL` | Nej | FROM-adresse (default: Resend test-afsender) |

Der er **ingen** separat `SITE_URL`. Uden `RESEND_API_KEY` returnerer `/api/bookings` og `/api/contact` **503** — der vises aldrig falsk success. Uden `DATABASE_URL` sendes kun e-mail.

### Hvad du skal sætte i Vercel

Vercel → Project → **Settings** → **Environment Variables**. Sæt mindst Production (gerne også Preview).

1. **`RESEND_API_KEY`** — Gratis på [resend.com/api-keys](https://resend.com/api-keys) (100 e-mails/dag). Indtil du verificerer et domæne på [resend.com/domains](https://resend.com/domains), kan du kun sende **til** den e-mail, du oprettede kontoen med. Valgfrit: `RESEND_FROM_EMAIL` og `BOOKINGS_NOTIFY_EMAIL`.
2. **`NEXT_PUBLIC_SITE_URL`** — Dit rigtige public URL, fx `https://dit-domæne.dk` (uden slash til sidst). Ikke localhost. Kræver ikke betalt plan; det er bare dit domæne eller `*.vercel.app`.
3. **`DATABASE_URL`** (valgfri) — Gratis Neon ([console.neon.tech](https://console.neon.tech)) eller Vercel Postgres. Brug den **upoolede** connection string med `sslmode=require`. Når den er sat, kører `prisma migrate deploy` i build.

Efter nye env vars: redeploy. Prisma-klienten genereres i `postinstall` og i `npm run build`.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Framer Motion · Resend · Prisma (valgfri)
