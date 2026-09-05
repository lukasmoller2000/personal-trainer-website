-- Audit fields for the explicit early-performance request collected at Checkout.
-- Required so we can record that the customer asked for delivery to begin
-- before the 14-day withdrawal period ends. Not a waiver flag.

ALTER TABLE "Order" ADD COLUMN "earlyPerformanceRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "earlyPerformanceRequestedAt" TIMESTAMP(3);
