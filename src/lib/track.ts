export const TRACK_EVENT_NAME = "nf:track";

export const trackEvents = [
  "booking_started",
  "booking_completed",
  "contact_submitted",
  "pt_cta_clicked",
  "coaching_cta_clicked",
] as const;

export type TrackEvent = (typeof trackEvents)[number];

export function track(event: TrackEvent, detail?: Record<string, unknown>) {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(TRACK_EVENT_NAME, {
      detail: { event, ...detail },
    })
  );
}
