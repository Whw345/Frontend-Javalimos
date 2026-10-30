import { ZodError } from "zod";
import { decideTemplate } from "@/lib/decision/decide";
import { getConfiguredDecisionModel, DecisionProviderConfigurationError } from "@/lib/decision/provider";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const result = await decideTemplate(body, getConfiguredDecisionModel());
    return Response.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { code: "INVALID_DECISION_REQUEST", message: "La entrada o la respuesta del modelo no cumple el schema." },
        { status: 422 },
      );
    }

    if (error instanceof DecisionProviderConfigurationError) {
      return Response.json(
        { code: "DECISION_PROVIDER_NOT_CONFIGURED", message: error.message },
        { status: 503 },
      );
    }

    return Response.json(
      { code: "DECISION_PROVIDER_ERROR", message: "No se pudo obtener una decisión." },
      { status: 502 },
    );
  }
}
