"use client";

import { useState } from "react";
import { CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Honeypot } from "@/components/ui/Honeypot";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { readErrorMessage } from "@/lib/validation";

export function ContactForm({ showHeading = true }: { showHeading?: boolean }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    website: "",
  });

  if (submitted) {
    return (
      <AnimatedSection>
        <div className="container-custom max-w-xl py-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-sage" />
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Tak for din besked
          </h2>
          <p className="mt-3 text-ink/65">Jeg vender tilbage hurtigst muligt.</p>
        </div>
      </AnimatedSection>
    );
  }

  return (
    <AnimatedSection id="kontakt">
      <div className="container-custom max-w-2xl">
        {showHeading && (
          <SectionHeading
            eyebrow="Kontakt"
            title="Har du spørgsmål? Kontakt mig."
            description="Vil du hellere spørge, før du booker PT eller starter Online Coaching? Send en kort besked."
          />
        )}
        <form
          className="relative space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            setError(null);
            try {
              const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
              });
              if (!response.ok) {
                throw new Error(await readErrorMessage(response, "Beskeden kunne ikke sendes"));
              }
              setSubmitted(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Noget gik galt");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <Honeypot
            value={formData.website}
            onChange={(value) => setFormData((prev) => ({ ...prev, website: value }))}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              id="name"
              label="Navn"
              value={formData.name}
              onChange={(value) => setFormData((prev) => ({ ...prev, name: value }))}
            />
            <Field
              id="phone"
              label="Telefon"
              type="tel"
              value={formData.phone}
              onChange={(value) => setFormData((prev) => ({ ...prev, phone: value }))}
            />
          </div>
          <Field
            id="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
          />
          <div>
            <label htmlFor="message" className="mb-2 block text-sm font-medium text-ink">
              Besked
            </label>
            <textarea
              id="message"
              required
              minLength={2}
              maxLength={2000}
              rows={5}
              value={formData.message}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, message: event.target.value }))
              }
              className="w-full resize-none rounded-xl border border-sand bg-white px-4 py-3 text-base outline-none ring-sage/40 placeholder:text-ink/35 focus:ring-2"
              placeholder="Hvad vil du gerne have hjælp til?"
            />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <Button type="submit" size="lg" disabled={submitting}>
            <Send className="h-4 w-4" />
            {submitting ? "Sender..." : "Send besked"}
          </Button>
        </form>
      </div>
    </AnimatedSection>
  );
}
