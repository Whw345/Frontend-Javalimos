import { ZodError } from "zod";
import { decideForTopic } from "@/lib/decision/decide";
import { getConfiguredDecisionModel, DecisionProviderConfigurationError } from "@/lib/decision/provider";
import { z } from "zod";
import { checkOrigin, HttpError } from "@/lib/server/errors";
import { requireCourse } from "@/lib/server/supabase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body: unknown = await request.json();
    const { courseId } = z.object({ courseId: z.string().min(1) }).parse(body);
    await requireCourse(courseId, true);
    const result = await decideForTopic(body, getConfiguredDecisionModel());
    return Response.json(result);
  } catch (error) {
    if (error instanceof HttpError)
      return Response.json({ code: error.code, message: error.message }, { status: error.status });
    if (error instanceof ZodError) {
      return Response.json(
        {
          code: "INVALID_DECISION_REQUEST",
          message: "La entrada o la respuesta del modelo no cumple el schema.",
        },
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
