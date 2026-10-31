import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { copy } from "@/content/copy";
import { DEFAULT_COURSE_ID } from "@/lib/config";
import { cn } from "@/lib/utils/cn";

/** Gratis vs Premium (§8 del spec). Sin pagos reales en esta versión. */
export default async function PlansPage({ searchParams }: PageProps<"/planes">) {
  const { curso } = await searchParams;
  const courseId = typeof curso === "string" && curso ? curso : DEFAULT_COURSE_ID;
  const plans = copy.debate.plans;

  return (
    <div className="min-h-dvh bg-(image:--gradient-surface) px-4 py-8 md:px-6 lg:px-8 lg:py-12">
      <main className="mx-auto flex w-full max-w-240 flex-col gap-8">
        <header className="flex flex-col gap-2">
          <p className="type-overline text-reward">{plans.overline}</p>
          <h1 className="type-h1 text-text">{plans.title}</h1>
          <p className="max-w-prose type-body text-text-secondary">{plans.subtitle}</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="type-h2 text-text">{plans.free}</h2>
              <Badge>{plans.current}</Badge>
            </div>
            <FeatureList features={plans.freeFeatures} />
          </Card>

          <Card className="flex flex-col gap-4 border-reward/40">
            <h2 className="flex items-center gap-2 type-h2 text-text">
              <Sparkles aria-hidden className="size-5 text-reward" />
              {plans.premium}
            </h2>
            <FeatureList features={plans.premiumFeatures} />
            <Button variant="reward" size="lg" className="mt-auto w-full" disabled>
              {plans.cta}
            </Button>
          </Card>
        </div>

        <Link
          href={`/cursos/${encodeURIComponent(courseId)}/jugar`}
          className={cn(buttonVariants({ variant: "ghost" }), "self-start")}
        >
          {plans.back}
        </Link>
      </main>
    </div>
  );
}

function FeatureList({ features }: { features: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2 type-body text-text-secondary">
          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
          {feature}
        </li>
      ))}
    </ul>
  );
}
