-- Additive VFG membership audit fields on Order.
-- Price is resolved server-side at checkout-creation time. Never from the client.

ALTER TABLE "Order" ADD COLUMN "vfgMemberVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "priceTier" TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE "Order" ADD COLUMN "chargedAmountOre" INTEGER;
ALTER TABLE "Order" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "vfgMemberId" TEXT;
