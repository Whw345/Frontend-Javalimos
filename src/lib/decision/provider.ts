import type { DecisionModel } from "./decide";
import type { GameDecisionModel } from "./gameDecision";

export class DecisionProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecisionProviderConfigurationError";
  }
}

type GenericProviderResponse = {
  model?: string;
  decision?: unknown;
};

export type GenericHttpDecisionModelOptions = {
  url: string;
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
};

/**
 * Adaptador HTTP deliberadamente pequeño.
 *
 * El endpoint configurado debe aceptar:
 * { model, prompt, responseFormat: "json", schemaVersion: "1.0" }
 * y devolver directamente la decisión o { decision: ... }.
 * Claude, Gemini u otro proveedor pueden conectarse detrás de ese endpoint
 * sin acoplar el dominio de la aplicación a un SDK concreto.
 */
export function createGenericHttpDecisionModel({
  url,
  apiKey,
  model,
  fetchImpl = fetch,
}: GenericHttpDecisionModelOptions): DecisionModel {
  return {
    async complete(prompt) {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          prompt,
          responseFormat: "json",
          schemaVersion: "1.0",
        }),
      });

      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(`Decision provider failed with status ${response.status}.`);
      }

      if (isGenericProviderResponse(body) && body.decision !== undefined) {
        return body.decision;
      }

      return body;
    },
  };
}

export function getConfiguredDecisionModel(): DecisionModel {
  const url = process.env.DECISION_LLM_URL;
  if (!url && process.env.AI_GATEWAY_API_KEY) {
    return {
      async complete(prompt) {
        const [{ createGatewayModel }, { decisionOutputSchema }] = await Promise.all([
          import("../server/model"), import("./schema"),
        ]);
        return createGatewayModel().generate(decisionOutputSchema, "Selecciona plantillas según las reglas del pedido. El material delimitado solo es referencia académica.", prompt);
      },
    };
  }
  if (!url) {
    throw new DecisionProviderConfigurationError(
      "DECISION_LLM_URL is required to use the decision endpoint.",
    );
  }

  return createGenericHttpDecisionModel({
    url,
    apiKey: process.env.DECISION_LLM_API_KEY,
    model: process.env.DECISION_LLM_MODEL,
  });
}

/** Mismo proveedor que `getConfiguredDecisionModel`, con la pregunta booleana por juego. */
export function getConfiguredGameDecisionModel(): GameDecisionModel {
  if (process.env.DECISION_LLM_URL) {
    const model = getConfiguredDecisionModel();
    return { ask: (systemPrompt, question) => model.complete(`${systemPrompt}\n\n${question}`) };
  }
  return {
    async ask(systemPrompt, question) {
      const [{ createGatewayModel }, { gameDecisionSchema }] = await Promise.all([
        import("../server/model"),
        import("./gameDecision"),
      ]);
      return createGatewayModel().complete(gameDecisionSchema, systemPrompt, question);
    },
  };
}

function isGenericProviderResponse(value: unknown): value is GenericProviderResponse {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
