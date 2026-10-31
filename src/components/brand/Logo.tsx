import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";

function CuyProfile({ size }: { size: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 64 64" fill="none">
      <path
        d="M6 42c0-13 11-23 26-23 12 0 22 7 25 16 1 3-1 6-4 7-2 8-10 12-24 12C14 54 6 50 6 42Z"
        fill="var(--color-brand-cream)"
      />
      <path d="M6 42c0-11 8-20 19-22 3 9 2 23-5 32C11 51 6 47 6 42Z" fill="var(--color-primary)" />
      <path d="M25 20c5-1 10-1 14 1-1 8-6 13-12 14-1-5-1-10-2-15Z" fill="var(--color-brand-chocolate)" />
      <circle cx="45" cy="31" r="2.6" fill="var(--color-brand-ink)" />
      <path d="M55 39c1 1 1 2 0 3" stroke="var(--color-brand-ink)" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M36 12 54 19 36 26 18 19Z"
        fill="var(--color-brand-ink)"
        stroke="var(--color-primary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M48 17v9" stroke="var(--color-reward)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Marca (§3.1): cuy de perfil, mirando hacia el nombre. `tagline` es el logotipo principal. */
export function Logo({ tagline = false, className }: { tagline?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <CuyProfile size={tagline ? 56 : 32} />
      <span className="flex flex-col">
        <span className={cn("type-logo text-brand-cream", tagline ? "text-3xl" : "text-lg")}>
          {copy.brand.name}
        </span>
        {tagline && <span className="type-label text-primary-text">{copy.brand.tagline}</span>}
      </span>
    </span>
  );
}
