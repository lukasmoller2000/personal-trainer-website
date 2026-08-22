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
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

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
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "min-h-12 w-full rounded-xl border border-sand bg-white px-4 py-3 text-base text-ink outline-none transition-shadow",
          "placeholder:text-ink/35 focus:ring-2 focus:ring-sage/40"
        )}
      />
    </div>
  );
}
