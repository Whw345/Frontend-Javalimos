interface GamePromptProps {
  children: string;
}

export function GamePrompt({ children }: GamePromptProps) {
  return <h1 className="max-w-prose py-3 short:py-2 type-prompt lg:py-4 text-text">{children}</h1>;
}
