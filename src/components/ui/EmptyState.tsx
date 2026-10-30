import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center gap-3 text-center", className)}>
      <h2 className="type-h2 text-text">{title}</h2>
      {description && <p className="type-body text-text-secondary">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
