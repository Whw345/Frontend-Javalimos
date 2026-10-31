import { cn } from "@/lib/utils/cn";

export type CuyExpresion =
  | "espera"
  | "feliz"
  | "animo"
  | "invitando"
  | "pensando"
  | "celebrando"
  | "animando";

interface CuyFrontalProps {
  expresion: CuyExpresion;
  size?: number | "sm" | "md" | "lg";
  className?: string;
}

/**
 * Personaje que reacciona (§3.2). Conserva los rasgos que lo separan del panda: ojos a los
 * costados, cara partida con franja blanca, nariz ancha con labio partido, bigotes y orejas caídas.
 * Solo cambian ojos y boca. Es decorativo: el mensaje siempre va en el texto que lo acompaña.
 */
export function CuyFrontal({ expresion, size = 96, className }: CuyFrontalProps) {
  const numericSize = typeof size === "number" ? size : size === "sm" ? 64 : size === "lg" ? 128 : 96;
  const happy = expresion === "feliz" || expresion === "celebrando";
  const waiting = expresion === "espera" || expresion === "pensando";
  return (
    <svg
      aria-hidden
      width={numericSize}
      height={numericSize}
      viewBox="0 0 120 120"
      fill="none"
      className={cn("shrink-0", waiting && "motion-safe:animate-bounce", className)}
    >
      <ellipse
        cx="18"
        cy="52"
        rx="11"
        ry="20"
        transform="rotate(14 18 52)"
        fill="var(--color-brand-chocolate)"
      />
      <ellipse cx="102" cy="52" rx="11" ry="20" transform="rotate(-14 102 52)" fill="var(--color-primary)" />
      <ellipse cx="60" cy="64" rx="46" ry="44" fill="var(--color-brand-cream)" />
      <path
        d="M60 20C34 20 14 40 14 64c0 8 2 15 6 21 14 1 28-7 34-20 2-14 3-30 6-45Z"
        fill="var(--color-primary)"
      />
      <path
        d="M60 20c26 0 46 20 46 44 0 8-2 15-6 21-14 1-28-7-34-20-2-14-3-30-6-45Z"
        fill="var(--color-brand-chocolate)"
      />
      {happy ? (
        <>
          <path
            d="M26 58c3-5 9-5 12 0"
            stroke="var(--color-brand-ink)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M82 58c3-5 9-5 12 0"
            stroke="var(--color-brand-cream)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="32" cy="58" r="7" fill="var(--color-brand-ink)" />
          <circle cx="88" cy="58" r="7" fill="var(--color-brand-ink)" />
          <circle cx="34.5" cy="55.5" r="2.2" fill="var(--color-brand-cream)" />
          <circle cx="90.5" cy="55.5" r="2.2" fill="var(--color-brand-cream)" />
        </>
      )}
      <ellipse cx="60" cy="76" rx="13" ry="7" fill="var(--color-brand-chocolate)" />
      <path d="M60 83v6" stroke="var(--color-brand-ink)" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d={happy ? "M46 89c4 8 24 8 28 0" : expresion === "animo" || expresion === "animando" ? "M50 91c3 4 17 4 20 0" : "M52 91h16"}
        stroke="var(--color-brand-ink)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M34 78 12 74M34 84l-22 2M86 78l22-4M86 84l22 2"
        stroke="var(--color-brand-ink)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
