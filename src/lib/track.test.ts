import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { track, TRACK_EVENT_NAME } from "./track";

describe("track", () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete globalThis.window;
  });

  it("no-ops when window is missing", () => {
    assert.doesNotThrow(() => track("booking_started"));
  });

  it("dispatches a first-party CustomEvent", () => {
    const received: unknown[] = [];
    globalThis.window = {
      dispatchEvent(event: Event) {
        received.push((event as CustomEvent).detail);
        return true;
      },
    } as Window & typeof globalThis;

    track("pt_cta_clicked", { href: "/booking?produkt=session" });

    assert.equal(received.length, 1);
    assert.deepEqual(received[0], {
      event: "pt_cta_clicked",
      href: "/booking?produkt=session",
    });
    assert.equal(TRACK_EVENT_NAME, "nf:track");
  });
});
