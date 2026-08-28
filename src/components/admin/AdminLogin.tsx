"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Honeypot } from "@/components/ui/Honeypot";
import { readErrorMessage } from "@/lib/validation";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="mx-auto max-w-md space-y-4 rounded-2xl border border-sand bg-white p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        try {
          const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password, website }),
          });
          if (!response.ok) {
            throw new Error(await readErrorMessage(response, "Login fejlede"));
          }
          window.location.reload();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Login fejlede");
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <Honeypot value={website} onChange={setWebsite} />
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Admin</h1>
      <Field
        id="admin-password"
        label="Adgangskode"
        type="password"
        value={password}
        onChange={setPassword}
      />
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Logger ind..." : "Log ind"}
      </Button>
    </form>
  );
}
