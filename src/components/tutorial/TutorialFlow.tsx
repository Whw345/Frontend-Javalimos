"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { GameSlug } from "@/games/types";
import { gameTutorials } from "@/lib/tutorials";

type TutorialStage = "intro" | "steps" | "complete";

interface TutorialFlowProps {
  game: GameSlug;
  gameName: string;
  onStartRealGame: () => void;
  onClose: () => void;
}

/** Tutorial visual y hardcodeado. No crea sesiones ni consume el reto semanal. */
export function TutorialFlow({ game, gameName, onStartRealGame, onClose }: TutorialFlowProps) {
  const tutorial = gameTutorials[game];
  const [stage, setStage] = useState<TutorialStage>("intro");
  const [step, setStep] = useState(0);

  const finishStep = () => {
    if (step + 1 >= tutorial.steps.length) setStage("complete");
    else setStep((current) => current + 1);
  };

  return (
    <div className="fixed inset-0 z-(--z-modal) flex items-center justify-center bg-bg/80 px-4 py-6 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-title"
        className="w-full max-w-lg rounded-2xl border border-border bg-surface-raised p-6 shadow-lg"
      >
        {stage === "intro" && (
          <>
            <p className="type-overline text-reward">Antes de empezar</p>
            <h2 id="tutorial-title" className="mt-2 type-h2 text-text">
              Aprende a jugar: {gameName}
            </h2>
            <p className="mt-3 type-body text-text-secondary">{tutorial.description}</p>
            <div className="mt-5 rounded-xl border border-border bg-surface p-4">
              <p className="type-label text-text">Ejemplo</p>
              <p className="mt-1 type-body text-text-secondary">{tutorial.example}</p>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={onClose}>
                Jugar directamente
              </Button>
              <Button onClick={() => setStage("steps")}>Ver tutorial</Button>
            </div>
          </>
        )}

        {stage === "steps" && (
          <>
            <p className="type-overline text-reward">
              Paso {step + 1} de {tutorial.steps.length}
            </p>
            <h2 id="tutorial-title" className="mt-2 type-h2 text-text">
              Prueba la mecánica
            </h2>
            <p className="mt-5 rounded-xl border border-primary/30 bg-primary-soft p-5 type-body text-text">
              {tutorial.steps[step]}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={onClose}>
                Omitir tutorial
              </Button>
              <Button onClick={finishStep}>
                {step + 1 === tutorial.steps.length ? "Terminar tutorial" : "Siguiente"}
              </Button>
            </div>
          </>
        )}

        {stage === "complete" && (
          <>
            <p className="type-overline text-reward">Tutorial completado</p>
            <h2 id="tutorial-title" className="mt-2 type-h2 text-text">
              Ahora sí, prepárate para jugar de verdad
            </h2>
            <p className="mt-3 type-body text-text-secondary">
              Ya conoces la mecánica. El siguiente paso abrirá tu reto real.
            </p>
            <div className="mt-6 flex justify-end">
              <Button onClick={onStartRealGame}>Jugar de verdad</Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

