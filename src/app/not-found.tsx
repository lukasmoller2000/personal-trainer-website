import { Button } from "@/components/ui/Button";

export const metadata = {
  title: "Siden findes ikke",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="flex min-h-[80vh] flex-col items-center justify-center px-5 pt-28 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage">404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">
        Siden findes ikke
      </h1>
      <p className="mt-3 max-w-md text-ink/60">
        Linket virker ikke. Gå tilbage til forsiden, eller book en tid.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button href="/">Forside</Button>
        <Button href="/booking?produkt=session" variant="outline">
          Book personlig træning
        </Button>
      </div>
    </section>
  );
}
