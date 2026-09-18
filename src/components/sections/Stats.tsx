import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { getProduct } from "@/lib/products";
import { siteConfig } from "@/lib/utils";

function kroner(amount: number) {
  return `${amount} kr.`;
}

const session = getProduct("session");
const ptPrice = kroner(session?.price ?? 300);
const ptMemberPrice = session?.memberPrice != null ? kroner(session.memberPrice) : null;
const ptMemberLabel = session?.memberPriceLabel ?? "VFG-medlem";

function StatFigure({
  value,
  label,
  accent = false,
  compact = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 text-center lg:text-left">
      <p
        className={
          compact
            ? "font-display text-3xl font-extrabold italic tracking-tight text-sage md:text-4xl"
            : "font-display text-4xl font-extrabold italic tracking-tight text-sage md:text-5xl"
        }
      >
        {value}
      </p>
      <p className={accent ? "mt-1 text-sm font-medium text-sage" : "mt-2 text-sm text-white/55"}>
        {label}
      </p>
    </div>
  );
}

export function Stats() {
  return (
    <AnimatedSection className="bg-ink pt-0">
      <div className="container-custom">
        <div className="grid items-start gap-8 rounded-[2rem] border border-white/10 bg-forest px-6 py-10 sm:grid-cols-2 lg:grid-cols-4 md:px-10">
          <StatFigure value="1:1" label="Personlig træning" />
          <div className="grid min-w-0 gap-4">
            <StatFigure value={ptPrice} label="Normalpris" compact />
            {ptMemberPrice ? (
              <StatFigure value={ptMemberPrice} label={ptMemberLabel} accent compact />
            ) : null}
          </div>
          <StatFigure value="799 kr." label="Pr. md. online" />
          <StatFigure value={siteConfig.location} label={siteConfig.venue} />
        </div>
      </div>
    </AnimatedSection>
  );
}
