-- Additive GDPR Art. 9(2)(a) consent documentation for voluntary health free-text.
-- Nullable columns only. No DEFAULT. No NOT NULL. No UPDATE of existing rows.
-- Existing Booking/Order/ContactMessage rows stay NULL and must never be
-- interpreted as consented. Do not apply to production from this change set.

ALTER TABLE "Booking" ADD COLUMN "healthConsentAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "healthConsentVersion" TEXT;

ALTER TABLE "Order" ADD COLUMN "healthConsentAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "healthConsentVersion" TEXT;

ALTER TABLE "ContactMessage" ADD COLUMN "healthConsentAt" TIMESTAMP(3);
ALTER TABLE "ContactMessage" ADD COLUMN "healthConsentVersion" TEXT;
