"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Honeypot } from "@/components/ui/Honeypot";
import {
  getCalendarDays,
  getSlotsForDate,
  isBookableDate,
  monthTitle,
  toIsoDate,
  weekdayLabels,
} from "@/lib/availability";
import { getProduct, products, requiresTimeslot, type Product } from "@/lib/products";
import { cn, formatDate, priceLabel } from "@/lib/utils";
import { readErrorMessage } from "@/lib/validation";

type FormState = {
  name: string;
  email: string;
  phone: string;
  goal: string;
  notes: string;
  website: string;
};

type StepId = "product" | "date" | "time" | "details";

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  goal: "",
  notes: "",
  website: "",
};

const stepCopy: Record<StepId, string> = {
  product: "Ydelse",
  date: "Dato",
  time: "Tid",
  details: "Oplysninger",
};

function stepsForProduct(product?: Product): StepId[] {
  if (product && !requiresTimeslot(product)) {
    return ["product", "details"];
  }
  return ["product", "date", "time", "details"];
}

export function BookingWizard({ initialProductId }: { initialProductId?: string }) {
  const initialProduct = initialProductId ? getProduct(initialProductId) : undefined;
  const [product, setProduct] = useState<Product | undefined>(initialProduct);
  const [step, setStep] = useState(initialProduct ? 1 : 0);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [takenTimes, setTakenTimes] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const steps = stepsForProduct(product);
  const currentStep = steps[step] ?? "product";
  const needsTimeslot = product ? requiresTimeslot(product) : true;
  const isInquiry = product?.bookingType === "inquiry";

  const days = useMemo(
    () => getCalendarDays(cursor.year, cursor.month),
    [cursor.year, cursor.month]
  );
  const slots = selectedDate ? getSlotsForDate(selectedDate) : [];

  useEffect(() => {
    if (!selectedDate) return;
    const iso = toIsoDate(selectedDate);
    fetch(`/api/bookings?date=${iso}`)
      .then((response) => response.json())
      .then((data: { times?: string[] }) => setTakenTimes(data.times ?? []))
      .catch(() => setTakenTimes([]));
  }, [selectedDate]);

  const submit = async () => {
    if (!product) return;
    if (needsTimeslot && (!selectedDate || !selectedTime)) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          ...form,
          ...(needsTimeslot && selectedDate && selectedTime
            ? { date: toIsoDate(selectedDate), time: selectedTime }
            : {}),
        }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Booking kunne ikke oprettes"));
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noget gik galt");
    } finally {
      setSubmitting(false);
    }
  };

  if (done && product) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-sand bg-white p-8 text-center md:p-12">
        <CheckCircle className="mx-auto mb-5 h-12 w-12 text-sage" />
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {isInquiry ? "Din forespørgsel er sendt" : "Din booking er sendt"}
        </h2>
        <dl className="mt-8 space-y-3 text-left text-sm">
          <SummaryRow label="Ydelse" value={product.name} />
          <SummaryRow label="Pris" value={priceLabel(product)} />
          {isInquiry ? (
            <SummaryRow label="Opstart" value="Aftales" />
          ) : selectedDate && selectedTime ? (
            <>
              <SummaryRow
                label="Dato"
                value={formatDate(toIsoDate(selectedDate))}
              />
              <SummaryRow label="Tidspunkt" value={selectedTime} />
            </>
          ) : null}
        </dl>
        <p className="mt-6 text-ink/60">
          {isInquiry
            ? "Lukas kontakter dig om opstart af dit online forløb."
            : "Tiden er ikke reserveret endnu — jeg bekræfter tidspunktet og sender betalingsinfo."}
        </p>
        <Button href="/" className="mt-8">
          Til forsiden
        </Button>
      </div>
    );
  }

  const canShowDetails = Boolean(product) && (!needsTimeslot || (selectedDate && selectedTime));

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_280px]">
      <div>
        <ol
          className={cn(
            "mb-8 grid gap-2",
            steps.length === 2 ? "grid-cols-2" : "grid-cols-4"
          )}
        >
          {steps.map((id, index) => (
            <li
              key={id}
              className={cn(
                "rounded-full px-2 py-2 text-center text-[11px] font-medium sm:text-sm",
                step === index
                  ? "bg-ink text-cream"
                  : step > index
                    ? "bg-sand text-ink"
                    : "bg-sand/50 text-ink/40"
              )}
            >
              {index + 1}. {stepCopy[id]}
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === "product" && (
              <div className="grid gap-3">
                {products.map((item) => {
                  const label = priceLabel(item);
                  const showTagline = label !== item.tagline;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setProduct(item);
                        setSelectedDate(null);
                        setSelectedTime(null);
                        setError(null);
                        setStep(1);
                      }}
                      className={cn(
                        "flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl border bg-white p-5 text-left transition-colors hover:border-ink",
                        product?.id === item.id ? "border-ink" : "border-sand"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-display text-xl font-semibold tracking-tight text-ink">
                          {item.name}
                        </p>
                        <p className="mt-1 text-sm text-ink/70">{item.fits}</p>
                        {showTagline && (
                          <p className="mt-1 text-sm text-ink/50">{item.tagline}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-medium text-ink">{label}</p>
                        {item.priceNote && (
                          <p className="mt-0.5 text-xs text-ink/45">{item.priceNote}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {currentStep === "date" && (
              <div className="rounded-2xl border border-sand bg-white p-5 md:p-8">
                <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  Vælg dato
                </h3>
                <div className="mt-6 flex items-center justify-between">
                  <button
                    type="button"
                    className="min-h-11 rounded-xl px-3 hover:bg-sand"
                    onClick={() =>
                      setCursor((prev) =>
                        prev.month === 0
                          ? { year: prev.year - 1, month: 11 }
                          : { year: prev.year, month: prev.month - 1 }
                      )
                    }
                    aria-label="Forrige måned"
                  >
                    ←
                  </button>
                  <p className="font-medium capitalize">{monthTitle(cursor.year, cursor.month)}</p>
                  <button
                    type="button"
                    className="min-h-11 rounded-xl px-3 hover:bg-sand"
                    onClick={() =>
                      setCursor((prev) =>
                        prev.month === 11
                          ? { year: prev.year + 1, month: 0 }
                          : { year: prev.year, month: prev.month + 1 }
                      )
                    }
                    aria-label="Næste måned"
                  >
                    →
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink/40">
                  {weekdayLabels.map((label) => (
                    <div key={label} className="py-2">
                      {label}
                    </div>
                  ))}
                  {days.map((day, index) => {
                    if (!day) return <div key={`empty-${index}`} />;
                    const bookable = isBookableDate(day);
                    const selected = selectedDate && toIsoDate(day) === toIsoDate(selectedDate);
                    return (
                      <button
                        key={toIsoDate(day)}
                        type="button"
                        disabled={!bookable}
                        onClick={() => {
                          setSelectedDate(day);
                          setSelectedTime(null);
                        }}
                        className={cn(
                          "flex min-h-11 items-center justify-center rounded-xl text-sm",
                          !bookable && "cursor-not-allowed text-ink/20",
                          bookable && !selected && "hover:bg-sand",
                          selected && "bg-ink text-cream"
                        )}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button variant="ghost" onClick={() => setStep(0)}>
                    <ArrowLeft className="h-4 w-4" /> Tilbage
                  </Button>
                  <Button disabled={!selectedDate} onClick={() => setStep(2)}>
                    Fortsæt <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === "time" && selectedDate && (
              <div className="rounded-2xl border border-sand bg-white p-5 md:p-8">
                <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  Vælg tidspunkt
                </h3>
                <p className="mt-1 text-ink/55">{formatDate(toIsoDate(selectedDate))}</p>
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.map((slot) => {
                    const taken = takenTimes.includes(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={taken}
                        onClick={() => setSelectedTime(slot)}
                        className={cn(
                          "min-h-12 rounded-xl border text-sm font-medium",
                          taken && "cursor-not-allowed border-sand text-ink/25 line-through",
                          !taken && selectedTime === slot && "border-ink bg-ink text-cream",
                          !taken && selectedTime !== slot && "border-sand hover:border-ink"
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                {slots.length > 0 && slots.every((slot) => takenTimes.includes(slot)) && (
                  <p className="mt-4 text-sm text-ink/55">
                    Alle tider er optaget denne dag. Vælg en anden dato.
                  </p>
                )}
                <div className="mt-8 flex flex-wrap gap-3">
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-4 w-4" /> Tilbage
                  </Button>
                  <Button disabled={!selectedTime} onClick={() => setStep(3)}>
                    Fortsæt <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === "details" && canShowDetails && product && (
              <div className="rounded-2xl border border-sand bg-white p-5 md:p-8">
                <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  Dine oplysninger
                </h3>
                {isInquiry && (
                  <p className="mt-2 text-sm leading-relaxed text-ink/55">
                    Online Coaching er et løbende program uden fast træningstid. Du booker ikke en
                    tid i gymmet — Lukas kontakter dig om opstart.
                  </p>
                )}
                <form
                  className="relative mt-6 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                  }}
                >
                  <Honeypot
                    value={form.website}
                    onChange={(value) => setForm((prev) => ({ ...prev, website: value }))}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      id="name"
                      label="Navn"
                      value={form.name}
                      onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
                    />
                    <Field
                      id="phone"
                      label="Telefon"
                      type="tel"
                      value={form.phone}
                      onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                    />
                  </div>
                  <Field
                    id="email"
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
                  />
                  <Field
                    label="Dit mål"
                    value={form.goal}
                    onChange={(value) => setForm((prev) => ({ ...prev, goal: value }))}
                    placeholder="Styrke, vægttab, struktur..."
                    maxLength={200}
                  />
                  <div>
                    <label htmlFor="booking-notes" className="mb-2 block text-sm font-medium text-ink">
                      Evt. bemærkninger
                    </label>
                    <textarea
                      id="booking-notes"
                      rows={4}
                      maxLength={2000}
                      value={form.notes}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, notes: event.target.value }))
                      }
                      className="w-full resize-none rounded-xl border border-sand px-4 py-3 outline-none ring-sage/40 focus:ring-2"
                      placeholder="Skader, træningserfaring..."
                    />
                  </div>
                  {error && <p className="text-sm text-red-700">{error}</p>}
                  <div className="flex flex-wrap gap-3">
                    <Button variant="ghost" type="button" onClick={() => setStep(step - 1)}>
                      <ArrowLeft className="h-4 w-4" /> Tilbage
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      <Check className="h-4 w-4" />
                      {submitting
                        ? isInquiry
                          ? "Sender..."
                          : "Booker..."
                        : isInquiry
                          ? "Send forespørgsel"
                          : "Bekræft booking"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <aside className="h-fit rounded-2xl border border-sand bg-white p-5 lg:sticky lg:top-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
          {isInquiry ? "Din opstart" : "Din booking"}
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <SummaryRow label="Ydelse" value={product?.name ?? "Ikke valgt"} />
          <SummaryRow label="Pris" value={product ? priceLabel(product) : "—"} />
          {isInquiry ? (
            <SummaryRow label="Opstart" value="Aftales" />
          ) : (
            <>
              <SummaryRow
                label="Dato"
                value={selectedDate ? formatDate(toIsoDate(selectedDate)) : "Ikke valgt"}
              />
              <SummaryRow label="Tidspunkt" value={selectedTime ?? "Ikke valgt"} />
            </>
          )}
        </dl>
      </aside>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-sand pb-3 last:border-0 last:pb-0">
      <dt className="text-ink/45">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
