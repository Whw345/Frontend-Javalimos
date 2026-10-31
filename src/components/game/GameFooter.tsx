import { CornerDownLeft, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { copy } from "@/content/copy";
import type { HintState } from "@/stores/gameSessionStore";

interface GameFooterProps {
  hintAvailable: boolean;
  hint: HintState;
  onArmHint: () => void;
  onConfirmHint: () => void;
  onCancelHint: () => void;
  /** Solo en juegos con `submitMode: "button"`. */
  showSubmit: boolean;
  canSubmit: boolean;
  submitting: boolean;
  submittingLabel: string;
  onSubmit: () => void;
  submitError: string | null;
  onRetrySubmit: () => void;
}

export function GameFooter({
  hintAvailable,
  hint,
  onArmHint,
  onConfirmHint,
  onCancelHint,
  showSubmit,
  canSubmit,
  submitting,
  submittingLabel,
  onSubmit,
  submitError,
  onRetrySubmit,
}: GameFooterProps) {
  return (
    <footer className="flex shrink-0 flex-col gap-3 border-t border-border py-3 short:py-2 lg:flex-row lg:py-4 lg:items-center lg:justify-between">
      <div className="flex min-h-11 flex-wrap items-center gap-2">
        {hintAvailable && (
          <HintControl hint={hint} onArm={onArmHint} onConfirm={onConfirmHint} onCancel={onCancelHint} />
        )}
      </div>

      {submitError ? (
        <div role="alert" className="flex items-center gap-3">
          <p className="type-body text-text-secondary">{submitError}</p>
          <Button variant="secondary" onClick={onRetrySubmit}>
            {copy.common.retry}
          </Button>
        </div>
      ) : (
        showSubmit && (
          <Button
            size="lg"
            className="w-full lg:w-auto lg:min-w-60"
            disabled={!canSubmit}
            loading={submitting}
            onClick={onSubmit}
          >
            {submitting ? submittingLabel : copy.shell.submit}
            <Kbd className="border-transparent bg-text-on-primary/15 text-text-on-primary">
              <CornerDownLeft aria-hidden className="size-3!" />
            </Kbd>
          </Button>
        )
      )}
    </footer>
  );
}

interface HintControlProps {
  hint: HintState;
  onArm: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function HintControl({ hint, onArm, onConfirm, onCancel }: HintControlProps) {
  if (hint === "revealed") {
    return (
      <p className="flex items-center gap-2 type-label text-info">
        <Lightbulb aria-hidden className="size-5" />
        {copy.shell.hint.used}
      </p>
    );
  }

  // §11.5: la pista pide confirmación con un segundo H o Enter.
  if (hint === "armed" || hint === "loading") {
    return (
      <>
        <p className="type-body text-text-secondary">{copy.shell.hint.confirmQuestion}</p>
        <Button variant="secondary" size="sm" onClick={onConfirm} loading={hint === "loading"} autoFocus>
          {copy.shell.hint.confirm}
          <Kbd>H</Kbd>
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={hint === "loading"}>
          {copy.shell.hint.cancel}
        </Button>
      </>
    );
  }

  return (
    <Button variant="ghost" onClick={onArm} className="-ml-2">
      <Lightbulb aria-hidden className="text-info" />
      {copy.shell.hint.cta}
      <span className="text-text-muted">{copy.shell.hint.cost}</span>
      <Kbd>H</Kbd>
    </Button>
  );
}
