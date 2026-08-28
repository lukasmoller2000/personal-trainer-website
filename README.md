# Lukas Møller — Personlig træner

Hjemmeside til personlig træning i Viborg. Book en PT til 300 kr., send en forespørgsel på 5 træninger til 1.350 kr., eller send en forespørgsel om Online Coaching til 799 kr./md.

## Kom i gang

```bash
npm install
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000). Brug `npm run dev -- -p 3001`, hvis port 3000 allerede er i brug.

Kopiér `.env.example` til `.env.local` og udfyld nøglerne nedenfor, når du vil sende rigtig mail. Stripe-betaling er slået fra, indtil `PAYMENTS_ENABLED=true` sættes efter udtrykkelig godkendelse.

## Sider

- `/` — Forside
- `/ydelser` — Personlig træning, klippekort og Online Coaching
- `/booking` — Book 1 PT (dato/tid), send forespørgsel på 5 træninger, eller send Online Coaching-forespørgsel
- `/om` — Om træneren
- `/faq` — Spørgsmål
- `/kontakt` — Kontakt
- `/admin` — Kun hvis `ADMIN_PASSWORD` er sat (ellers 404)

## Tilpasning

Ret navn, priser, adresse og kontakt i:

- `src/lib/utils.ts` — brand, email, telefon, træningssted
- `src/lib/commerce.ts` — aflysning, moms, virksomhed
- `src/lib/products.ts` — ydelser og priser
- `src/lib/availability.ts` — ledige tider til PT

## Miljøvariabler

Alle navne står i `.env.example`.

| Variabel | Påkrævet live? | Bruges til |
|---|---|---|
| `RESEND_API_KEY` | Ja, ellers 503 på formularer | Booking + kontakt-mail |
| `NEXT_PUBLIC_SITE_URL` | Ja til SEO | `metadataBase`, sitemap, robots, Open Graph |
| `DATABASE_URL` | Nej (ja til Stripe/klippekort) | PostgreSQL til bookinger, ordrer, klip |
| `BOOKINGS_NOTIFY_EMAIL` | Nej | TO-adresse (default: `lukasmoller2000@gmail.com`) |
| `RESEND_FROM_EMAIL` | Nej | FROM-adresse (default: Resend test-afsender) |
| `PAYMENTS_ENABLED` | Nej | Default `false`. Live Stripe slår **ikke** til uden denne + nøgler |
| `STRIPE_SECRET_KEY` | Nej | Checkout. Dormant — sæt ikke rigtige nøgler uden godkendelse |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Nej | Stripe.js / Checkout (dormant) |
| `STRIPE_WEBHOOK_SECRET` | Nej | Webhook-signatur (dormant) |
| `ADMIN_PASSWORD` | Nej | `/admin`. Min. 8 tegn. Uden kode: 404 |
| `COMPANY_CVR` / `COMPANY_ADDRESS` | Nej | Vises kun hvis udfyldt |
| `VAT_REGISTERED` | Nej | Default `false` — ingen moms på prisen |

Der er **ingen** separat `SITE_URL`. Uden `RESEND_API_KEY` returnerer `/api/bookings` og `/api/contact` **503** — der vises aldrig falsk success. Booking/kontakt kører som e-mail-forespørgsel. Live Stripe er slået fra (`PAYMENTS_ENABLED` default `false`). Success-URL fra Stripe er **ikke** bevis for betaling.

### Hvad du skal sætte i Vercel

Vercel → Project → **Settings** → **Environment Variables**. Sæt mindst Production (gerne også Preview).

1. **`RESEND_API_KEY`** — Gratis på [resend.com/api-keys](https://resend.com/api-keys).
2. **`NEXT_PUBLIC_SITE_URL`** — Dit rigtige public URL, fx `https://lukasmoller.dk`.
3. **`DATABASE_URL`** (valgfri indtil Stripe) — Neon eller Vercel Postgres. Upoolet string med `sslmode=require`.
4. Stripe-nøgler kun når du er klar til rigtige betalinger — og først efter udtrykkelig godkendelse.

Efter nye env vars: redeploy. Prisma-klienten genereres i `postinstall` og i `npm run build`.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Framer Motion · Resend · Prisma (valgfri) · Stripe Checkout (valgfri)
