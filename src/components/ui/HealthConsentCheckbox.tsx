"use client";

import { HEALTH_CONSENT } from "@/lib/health-consent";

export function HealthConsentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-sand bg-sand/40 p-4">
      <label className="flex items-start gap-3 text-sm text-ink/80">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-sand"
          data-testid="health-consent"
        />
        <span>
          <span className="font-medium text-ink">{HEALTH_CONSENT.checkboxLabel}</span>
          <span className="mt-1 block text-ink/55">{HEALTH_CONSENT.help}</span>
        </span>
      </label>
    </div>
  );
}
