"use client";

import { cn } from "@/lib/utils";

export function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = true,
  minLength,
  maxLength,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");
  const inferredMax =
    maxLength ??
    (type === "email" ? 254 : type === "tel" ? 30 : inputId === "name" ? 80 : undefined);
  const inferredMin = minLength ?? (type === "tel" ? 8 : required ? 2 : undefined);

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        name={inputId}
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        minLength={inferredMin}
        maxLength={inferredMax}
        autoComplete={
          type === "email" ? "email" : type === "tel" ? "tel" : inputId === "name" ? "name" : undefined
        }
        inputMode={type === "email" ? "email" : type === "tel" ? "tel" : undefined}
        autoCapitalize={type === "email" ? "none" : undefined}
        autoCorrect={type === "email" || type === "tel" ? "off" : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "min-h-12 w-full rounded-xl border border-sand bg-white px-4 py-3 text-base text-ink outline-none transition-shadow",
          "placeholder:text-ink/35 focus:ring-2 focus:ring-sage/40"
        )}
      />
    </div>
  );
}
