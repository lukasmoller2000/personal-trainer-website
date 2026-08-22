import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sage">404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">
        Siden findes ikke
      </h1>
      <p className="mt-3 max-w-md text-ink/60">
        Linket virker ikke. Gå tilbage til forsiden, eller book en tid.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button href="/">Forside</Button>
        <Button href="/booking" variant="outline">
          Book nu
        </Button>
      </div>
    </section>
  );
}
