"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  cancellationConfig,
  sessionDuration,
} from "@/lib/commerce";
import {
  getProduct,
  isPaidProduct,
  products,
  requiresTimeslot,
  type Product,
} from "@/lib/products";
import { track } from "@/lib/track";
import { cn, formatDate, priceLabel } from "@/lib/utils";
import { readErrorMessage } from "@/lib/validation";

type FormState = {
  name: string;
  email: string;
  phone: string;
  goal: string;
  notes: string;
  website: string;
  birthYear: string;
};

type StepId = "product" | "date" | "time" | "details";

const emptyForm: FormState = {
  name: "",
  email: "",
  phone: "",
  goal: "",
  notes: "",
  website: "",
  birthYear: "",
};

const stepCopy: Record<StepId, string> = {
  product: "Ydelse",
  date: "Dato",
  time: "Tid",
  details: "Oplysninger",
};

function stepsForProduct(product?: Product, clipMode = false): StepId[] {
  if (clipMode) return ["date", "time", "details"];
  if (product && !requiresTimeslot(product)) {
    return ["product", "details"];
  }
  return ["product", "date", "time", "details"];
}

type ClipInfo = {
  remaining: number;
  totalSessions: number;
  status: string;
  name: string;
};

export function BookingWizard({
  initialProductId,
  clipToken,
  paymentsEnabled = false,
  collectBirthYear = false,
}: {
  initialProductId?: string;
  clipToken?: string;
  paymentsEnabled?: boolean;
  collectBirthYear?: boolean;
}) {
  const initialProduct = initialProductId ? getProduct(initialProductId) : undefined;
  const [product, setProduct] = useState<Product | undefined>(initialProduct);
  const [clipMode] = useState(Boolean(clipToken));
  const [clipInfo, setClipInfo] = useState<ClipInfo | null>(null);
  const [clipLookupEmail, setClipLookupEmail] = useState("");
  const [clipLookupDone, setClipLookupDone] = useState(false);
  const [step, setStep] = useState(clipToken ? 0 : initialProduct ? 1 : 0);
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
  const [doneRemaining, setDoneRemaining] = useState<number | null>(null);
  const submitLock = useRef(false);

  const steps = stepsForProduct(product, clipMode);
  const currentStep = steps[step] ?? (clipMode ? "date" : "product");
  const needsTimeslot = clipMode || (product ? requiresTimeslot(product) : true);
  const isInquiry = product?.bookingType === "inquiry";
  const payNow = Boolean(paymentsEnabled && product && isPaidProduct(product) && !clipMode);
  const isPackInquiry = Boolean(product?.bookingType === "pack" && !payNow && !clipMode);
  const sendInquiry = !payNow && !clipMode;

  const days = useMemo(
    () => getCalendarDays(cursor.year, cursor.month),
    [cursor.year, cursor.month]
  );
  const slots = selectedDate ? getSlotsForDate(selectedDate) : [];

  useEffect(() => {
    track("booking_started");
  }, []);

  useEffect(() => {
    if (!clipToken) return;
    fetch(`/api/clip-cards/book?token=${encodeURIComponent(clipToken)}`)
      .then((response) => response.json())
      .then((data: ClipInfo & { error?: string }) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setClipInfo(data);
        setForm((prev) => ({ ...prev, name: data.name, goal: "Klippekort" }));
      })
      .catch(() => setError("Klippekortet kunne ikke hentes"));
  }, [clipToken]);

  useEffect(() => {
    if (!selectedDate) return;
    const iso = toIsoDate(selectedDate);
    fetch(`/api/bookings?date=${iso}`)
      .then((response) => response.json())
      .then((data: { times?: string[] }) => setTakenTimes(data.times ?? []))
      .catch(() => setTakenTimes([]));
  }, [selectedDate]);

  const submit = async () => {
    if (submitLock.current) return;
    if (needsTimeslot && (!selectedDate || !selectedTime)) return;
    if (!clipMode && !product) return;
    submitLock.current = true;
    setSubmitting(true);
    setError(null);

    try {
      if (clipMode && clipToken) {
        const response = await fetch("/api/clip-cards/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: clipToken,
            website: form.website,
            notes: form.notes,
            ...(selectedDate && selectedTime
              ? { date: toIsoDate(selectedDate), time: selectedTime }
              : {}),
          }),
        });
        if (!response.ok) {
          submitLock.current = false;
          throw new Error(await readErrorMessage(response, "Booking kunne ikke oprettes"));
        }
        const data = (await response.json()) as { remaining?: number };
        setDoneRemaining(data.remaining ?? null);
        track("booking_completed", { productId: "clip" });
        setDone(true);
        return;
      }

      const endpoint = payNow ? "/api/checkout" : "/api/bookings";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product?.id,
          ...form,
          birthYear: collectBirthYear && form.birthYear ? Number(form.birthYear) : undefined,
          ...(needsTimeslot && selectedDate && selectedTime
            ? { date: toIsoDate(selectedDate), time: selectedTime }
            : {}),
        }),
      });
      if (!response.ok) {
        submitLock.current = false;
        throw new Error(await readErrorMessage(response, "Booking kunne ikke oprettes"));
      }
      const data = (await response.json()) as { url?: string };
      if (payNow && data.url) {
        window.location.href = data.url;
        return;
      }
      track("booking_completed", { productId: product?.id });
      setDone(true);
    } catch (err) {
      submitLock.current = false;
      setError(err instanceof Error ? err.message : "Noget gik galt");
    } finally {
      setSubmitting(false);
    }
  };

  const lookupClip = async () => {
    setError(null);
    setClipLookupDone(false);
    try {
      const response = await fetch("/api/clip-cards/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clipLookupEmail, website: form.website }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Kunne ikke sende link"));
      }
      setClipLookupDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noget gik galt");
    }
  };

  if (done && (product || clipMode)) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-sand bg-white p-8 text-center md:p-12">
        <CheckCircle className="mx-auto mb-5 h-12 w-12 text-sage" />
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {clipMode
            ? "Din træning er booket"
            : sendInquiry
              ? "Din forespørgsel er sendt"
              : "Din booking er sendt"}
        </h2>
        <dl className="mt-8 space-y-3 text-left text-sm">
          <SummaryRow
            label="Ydelse"
            value={clipMode ? "Personlig træning (klippekort)" : product?.name ?? ""}
          />
          {!clipMode && product ? (
            <SummaryRow label="Pris" value={priceLabel(product)} />
          ) : null}
          {clipMode && doneRemaining != null ? (
            <SummaryRow label="Saldo" value={`${doneRemaining} træninger tilbage`} />
          ) : null}
          {isInquiry && !clipMode ? (
            <SummaryRow label="Opstart" value="Aftales" />
          ) : selectedDate && selectedTime ? (
            <>
              <SummaryRow label="Dato" value={formatDate(toIsoDate(selectedDate))} />
              <SummaryRow label="Tidspunkt" value={selectedTime} />
            </>
          ) : null}
        </dl>
        <p className="mt-6 text-ink/60">
          {clipMode
            ? "Tiden er reserveret. Du får en bekræftelse på mail, hvis mail er sat op."
            : isInquiry
              ? "Jeg vender tilbage på mail eller telefon, så vi kan aftale opstart af dit online forløb."
              : isPackInquiry
                ? "Jeg vender tilbage med bekræftelse og betalingsinfo. Tider bookes, når klippekortet er aktivt."
                : "Tiden er ikke reserveret endnu. Jeg bekræfter tidspunktet på mail eller telefon og sender betalingsinfo."}
        </p>
        <Button href="/" className="mt-8">
          Til forsiden
        </Button>
      </div>
    );
  }

  const canShowDetails =
    clipMode || (Boolean(product) && (!needsTimeslot || (selectedDate && selectedTime)));

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_280px]">
      <div>
        <p className="mb-3 text-sm text-ink/55">
          Trin {step + 1} af {steps.length}: {stepCopy[currentStep]}
        </p>
        <ol
          className={cn(
            "mb-8 grid gap-2",
            steps.length === 2 ? "grid-cols-2" : steps.length === 3 ? "grid-cols-3" : "grid-cols-4"
          )}
          aria-label="Bookingtrin"
        >
          {steps.map((id, index) => (
            <li
              key={id}
              aria-current={step === index ? "step" : undefined}
              className={cn(
                "truncate rounded-full px-2 py-2 text-center text-[11px] font-medium sm:text-sm",
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

        {clipMode && clipInfo && (
          <p className="mb-6 rounded-xl bg-sand px-4 py-3 text-sm text-ink/70">
            {clipInfo.remaining} træninger tilbage
          </p>
        )}

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
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">
                          {item.label}
                        </p>
                        <p className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">
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
                <ClipLookup
                  email={clipLookupEmail}
                  onEmail={setClipLookupEmail}
                  onSubmit={() => void lookupClip()}
                  done={clipLookupDone}
                  honeypot={form.website}
                  onHoneypot={(value) => setForm((prev) => ({ ...prev, website: value }))}
                />
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
                    className="min-h-11 min-w-11 rounded-xl px-3 hover:bg-sand"
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
                    className="min-h-11 min-w-11 rounded-xl px-3 hover:bg-sand"
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
                    const iso = toIsoDate(day);
                    return (
                      <button
                        key={iso}
                        type="button"
                        disabled={!bookable}
                        aria-label={`${day.getDate()}. ${monthTitle(cursor.year, cursor.month)}${bookable ? "" : ", ikke ledig"}`}
                        aria-pressed={Boolean(selected)}
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
                  {!clipMode && (
                    <Button variant="ghost" onClick={() => setStep(0)}>
                      <ArrowLeft className="h-4 w-4" /> Tilbage
                    </Button>
                  )}
                  <Button disabled={!selectedDate} onClick={() => setStep(clipMode ? 1 : 2)}>
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
                        aria-pressed={selectedTime === slot}
                        aria-label={taken ? `${slot}, optaget` : slot}
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
                  <Button variant="ghost" onClick={() => setStep(clipMode ? 0 : 1)}>
                    <ArrowLeft className="h-4 w-4" /> Tilbage
                  </Button>
                  <Button disabled={!selectedTime} onClick={() => setStep(clipMode ? 2 : 3)}>
                    Fortsæt <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === "details" && canShowDetails && (product || clipMode) && (
              <div className="rounded-2xl border border-sand bg-white p-5 md:p-8">
                <h3 className="font-display text-2xl font-semibold tracking-tight text-ink">
                  {clipMode ? "Bekræft booking" : "Dine oplysninger"}
                </h3>
                {isInquiry && (
                  <p className="mt-2 text-sm leading-relaxed text-ink/55">
                    Online Coaching er et løbende program uden fast træningstid. Du booker ikke en
                    tid i gymmet — jeg kontakter dig om opstart.
                  </p>
                )}
                {isPackInquiry && (
                  <p className="mt-2 text-sm leading-relaxed text-ink/55">
                    Du vælger ikke tid nu. Jeg vender tilbage med bekræftelse og betalingsinfo. Tider
                    bookes, når klippekortet er aktivt.
                  </p>
                )}
                {sendInquiry && product?.bookingType === "session" && (
                  <p className="mt-2 text-sm leading-relaxed text-ink/55">
                    Du sender en forespørgsel med dato og tid. Tiden er ikke reserveret, før jeg har
                    svaret — jeg vender tilbage med bekræftelse og betalingsinfo.
                  </p>
                )}
                {clipMode && (
                  <p className="mt-2 text-sm leading-relaxed text-ink/55">
                    Vi trækker ét klip, når du bekræfter.{" "}
                    {clipInfo ? `${clipInfo.remaining} træninger tilbage nu.` : null}
                  </p>
                )}
                <form
                  className="relative mt-6 space-y-4"
                  aria-busy={submitting}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                  }}
                >
                  <Honeypot
                    value={form.website}
                    onChange={(value) => setForm((prev) => ({ ...prev, website: value }))}
                  />
                  {!clipMode && (
                    <>
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
                        id="goal"
                        label="Dit mål"
                        value={form.goal}
                        onChange={(value) => setForm((prev) => ({ ...prev, goal: value }))}
                        placeholder="Styrke, vægttab, struktur..."
                        maxLength={200}
                      />
                      {collectBirthYear && payNow && (
                        <Field
                          id="birthYear"
                          label="Fødselsår"
                          value={form.birthYear}
                          onChange={(value) => setForm((prev) => ({ ...prev, birthYear: value }))}
                          placeholder="ÅÅÅÅ"
                        />
                      )}
                    </>
                  )}
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
                  {error && (
                    <p className="text-sm text-red-700" role="alert">
                      {error}
                    </p>
                  )}
                  {payNow || clipMode ? (
                    <PolicyNote />
                  ) : (
                    <p className="text-sm text-ink/50">
                      Når du sender, vender jeg tilbage med bekræftelse. Tiden er ikke reserveret, før
                      jeg har svaret.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button variant="ghost" type="button" onClick={() => setStep(step - 1)}>
                      <ArrowLeft className="h-4 w-4" /> Tilbage
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      <Check className="h-4 w-4" />
                      {submitting
                        ? payNow
                          ? "Går til betaling..."
                          : clipMode
                            ? "Booker..."
                            : sendInquiry
                              ? "Sender..."
                              : "Booker..."
                        : payNow
                          ? "Gå til betaling"
                          : clipMode
                            ? "Bekræft med klip"
                            : sendInquiry
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
          {clipMode || isPackInquiry ? "Klippekort" : isInquiry ? "Din opstart" : "Din booking"}
        </p>
        <dl className="mt-4 space-y-3 text-sm">
          <SummaryRow
            label="Ydelse"
            value={clipMode ? "Personlig træning" : product?.name ?? "Ikke valgt"}
          />
          {!clipMode && (
            <SummaryRow label="Pris" value={product ? priceLabel(product) : "—"} />
          )}
          {clipInfo && (
            <SummaryRow label="Saldo" value={`${clipInfo.remaining} træninger tilbage`} />
          )}
          {isInquiry && !clipMode ? (
            <SummaryRow label="Opstart" value="Aftales" />
          ) : needsTimeslot ? (
            <>
              <SummaryRow
                label="Dato"
                value={selectedDate ? formatDate(toIsoDate(selectedDate)) : "Ikke valgt"}
              />
              <SummaryRow label="Tidspunkt" value={selectedTime ?? "Ikke valgt"} />
            </>
          ) : (
            <SummaryRow
              label="Tider"
              value={payNow ? "Bookes efter køb" : "Bookes når kortet er aktivt"}
            />
          )}
        </dl>
      </aside>
    </div>
  );
}

function PolicyNote() {
  return (
    <div className="space-y-2 text-sm text-ink/55">
      <p>{sessionDuration.copy}</p>
      <p>{sessionDuration.notAPromise}</p>
      <p>
        Du kan aflyse eller flytte gratis indtil {cancellationConfig.freeCancelHours} timer før
        træningen. Senere afbud eller udeblivelse tæller som brugt træning.
      </p>
    </div>
  );
}

function ClipLookup({
  email,
  onEmail,
  onSubmit,
  done,
  honeypot,
  onHoneypot,
}: {
  email: string;
  onEmail: (value: string) => void;
  onSubmit: () => void;
  done: boolean;
  honeypot: string;
  onHoneypot: (value: string) => void;
}) {
  return (
    <form
      className="relative mt-4 rounded-2xl border border-sand bg-white p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Honeypot value={honeypot} onChange={onHoneypot} />
      <p className="font-medium text-ink">Jeg har allerede et klippekort</p>
      <p className="mt-1 text-sm text-ink/55">
        Skriv den mail, du købte med. Vi sender et link til at booke, hvis kortet er aktivt.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => onEmail(event.target.value)}
          placeholder="din@mail.dk"
          className="min-h-12 flex-1 rounded-xl border border-sand px-4 outline-none ring-sage/40 focus:ring-2"
        />
        <Button type="submit">Send link</Button>
      </div>
      {done && (
        <p className="mt-3 text-sm text-ink/60">
          Hvis der er et aktivt klippekort på denne mail, sender vi et link.
        </p>
      )}
    </form>
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
