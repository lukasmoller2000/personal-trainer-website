import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MailSendError } from "./mail";
import { deliverContactMessage } from "./contact";
import { contactFormShowsSuccess } from "./contact-ui";

const sample = {
  name: "Test",
  email: "test@example.com",
  phone: "25890453",
  message: "Hej",
};

describe("contact form success", () => {
  it("shows success only when the request succeeded", () => {
    assert.equal(contactFormShowsSuccess(true), true);
    assert.equal(contactFormShowsSuccess(false), false);
  });

  it("resolves only after send succeeds", async () => {
    let sent = 0;
    let persisted = 0;
    await deliverContactMessage(sample, {
      send: async () => {
        sent += 1;
      },
      persist: async () => {
        persisted += 1;
      },
    });
    assert.equal(sent, 1);
    assert.equal(persisted, 1);
  });

  it("does not succeed when send fails", async () => {
    let persisted = 0;
    await assert.rejects(
      () =>
        deliverContactMessage(sample, {
          send: async () => {
            throw new MailSendError();
          },
          persist: async () => {
            persisted += 1;
          },
        }),
      MailSendError
    );
    assert.equal(persisted, 0);
  });
});
