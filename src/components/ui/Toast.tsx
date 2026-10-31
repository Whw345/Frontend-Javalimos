"use client";

import { CircleAlert, X } from "lucide-react";
import { Toast as RadixToast } from "radix-ui";
import { cn } from "@/lib/utils/cn";

/** §9.3: los avisos duran 4 s. */
export const TOAST_DURATION_MS = 4000;

export interface ToastMessage {
  /** Cambia en cada aviso, para volver a mostrar el mismo texto (p. ej. dos pegados seguidos). */
  id: number;
  text: string;
}

interface ToastProps {
  message: ToastMessage | null;
  onDismiss: () => void;
  closeLabel: string;
  /** Ajusta la posición para no tapar la acción principal de la pantalla. */
  viewportClassName?: string;
}

/**
 * Aviso breve (§9.3): arriba al centro en móvil, abajo a la derecha en desktop, 4 s.
 * Radix lo anuncia a lectores de pantalla. Un aviso a la vez.
 */
export function Toast({ message, onDismiss, closeLabel, viewportClassName }: ToastProps) {
  return (
    <RadixToast.Provider duration={TOAST_DURATION_MS} swipeDirection="up">
      {message && (
        <RadixToast.Root
          key={message.id}
          onOpenChange={(open) => !open && onDismiss()}
          className="flex items-center gap-3 rounded-md border border-border-strong bg-surface-raised py-2 pr-2 pl-4 shadow-md"
        >
          <CircleAlert aria-hidden className="size-5 shrink-0 text-warning" />
          <RadixToast.Description className="flex-1 type-body text-text">
            {message.text}
          </RadixToast.Description>
          <RadixToast.Close
            aria-label={closeLabel}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text focus-visible:shadow-glow-primary"
          >
            <X aria-hidden className="size-5" />
          </RadixToast.Close>
        </RadixToast.Root>
      )}
      <RadixToast.Viewport
        className={cn(
          "fixed inset-x-4 top-4 z-(--z-toast) mx-auto flex max-w-md flex-col gap-2 outline-none lg:inset-x-auto lg:top-auto lg:right-6 lg:bottom-6 lg:w-md",
          viewportClassName,
        )}
      />
    </RadixToast.Provider>
  );
}
