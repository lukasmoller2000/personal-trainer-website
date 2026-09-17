import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MailSendError } from "./mail";
import { deliverContactMessage } from "./contact";
import { contactFormShowsSuccess, phoneTelHref, whatsappHref } from "./contact-ui";

const sample = {
  name: "Test",
  email: "test@example.com",
  phone: "25890453",
  message: "Hej",
};

describe("contact links", () => {
  it("builds a tel href from the displayed phone number", () => {
    assert.equal(phoneTelHref("+45 25 89 04 53"), "tel:+4525890453");
  });

  it("opens WhatsApp with Lukas' number and a prefilled message", () => {
    assert.equal(
      whatsappHref("+45 25 89 04 53", "Hej Lukas, jeg vil gerne høre mere om personlig træning."),
      "https://wa.me/4525890453?text=Hej%20Lukas%2C%20jeg%20vil%20gerne%20h%C3%B8re%20mere%20om%20personlig%20tr%C3%A6ning."
    );
  });
});

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
