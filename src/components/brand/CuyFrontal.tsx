import { cn } from "@/lib/utils/cn";

export type CuyExpresion = "invitando" | "pensando" | "celebrando" | "animando";

const sizeClasses = { sm: "size-16", md: "size-24", lg: "size-32" } as const;

interface CuyFrontalProps {
  expresion: CuyExpresion;
  size?: keyof typeof sizeClasses;
  className?: string;
}

/**
 * Cuy frontal (§3.2): acompaña al estudiante en intros, esperas y resultados, nunca
 * mientras corre el temporizador. Ilustración provisional hasta exportar los SVG de
 * `public/brand/`; conserva los rasgos de la lámina (ojos a los costados, cara partida
 * naranja/chocolate con franja clara, nariz ancha, bigotes y orejas caídas).
 */
export function CuyFrontal({ expresion, size = "md", className }: CuyFrontalProps) {
  const happyEyes = expresion === "celebrando";
  const eyeY = expresion === "pensando" ? 54 : 58;

  return (
    <svg aria-hidden viewBox="0 0 120 120" className={cn(sizeClasses[size], "shrink-0", className)}>
      <defs>
        <clipPath id="cuy-head">
          <ellipse cx="60" cy="66" rx="44" ry="40" />
        </clipPath>
      </defs>

      {/* Orejas caídas */}
      <ellipse
        cx="24"
        cy="40"
        rx="14"
        ry="9"
        transform="rotate(-30 24 40)"
        className="fill-brand-chocolate"
      />
      <ellipse cx="96" cy="40" rx="14" ry="9" transform="rotate(30 96 40)" className="fill-brand-chocolate" />

      {/* Cabeza: cara partida naranja / chocolate con franja clara al centro */}
      <ellipse cx="60" cy="66" rx="44" ry="40" className="fill-brand-cream" />
      <g clipPath="url(#cuy-head)">
        <rect x="10" y="20" width="44" height="60" className="fill-brand-orange" />
        <rect x="66" y="20" width="44" height="60" className="fill-brand-chocolate" />
      </g>

      {/* Ojos a los costados */}
      {happyEyes ? (
        <g className="fill-none stroke-bg" strokeWidth="3" strokeLinecap="round">
          <path d="M28 60 q6 -7 12 0" />
          <path d="M80 60 q6 -7 12 0" />
        </g>
      ) : (
        <g className="fill-bg">
          <circle cx="34" cy={eyeY} r="5" />
          <circle cx="86" cy={eyeY} r="5" />
        </g>
      )}

      {/* Nariz ancha y labio partido */}
      <ellipse cx="60" cy="78" rx="10" ry="6" className="fill-bg" />
      <g className="fill-none stroke-bg" strokeWidth="2.5" strokeLinecap="round">
        <path d="M60 84 v5" />
        <path
          d={
            expresion === "pensando"
              ? "M60 89 q-5 1 -9 0 M60 89 q5 1 9 0"
              : "M60 89 q-6 6 -12 1 M60 89 q6 6 12 1"
          }
        />
      </g>

      {/* Bigotes */}
      <g className="stroke-text-muted" strokeWidth="1.5" strokeLinecap="round">
        <path d="M46 80 L22 76 M46 84 L22 86" />
        <path d="M74 80 L98 76 M74 84 L98 86" />
      </g>

      {/* Accesorios en amarillo de recompensa (§3.2) */}
      {expresion === "pensando" && (
        <g className="fill-reward">
          <circle cx="98" cy="18" r="3" />
          <circle cx="108" cy="12" r="2.5" />
          <circle cx="114" cy="5" r="2" />
        </g>
      )}
      {(expresion === "celebrando" || expresion === "animando") && (
        <g className="fill-reward">
          <path d="M12 14 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 z" />
          {expresion === "celebrando" && <path d="M106 10 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" />}
        </g>
      )}
    </svg>
  );
}
