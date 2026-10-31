import "server-only";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function handleApi(action: () => Promise<unknown>) {
  try {
    return Response.json(await action(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof HttpError) {
      return Response.json({ code: error.code, message: error.message }, { status: error.status });
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return Response.json(
        { code: "BAD_REQUEST", message: "Revisa los datos enviados o la estructura del contenido generado." },
        { status: 422 },
      );
    }
    // Never log provider bodies, document contents or credentials.
    console.error("API operation failed:", error instanceof Error ? error.name : "UnknownError");
    return Response.json(
      {
        code: "SERVER_ERROR",
        message: "No se pudo completar la operación. Revisa la configuración del servidor.",
      },
      { status: 503 },
    );
  }
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new HttpError(403, "FORBIDDEN", "Origen no permitido.");
  }
}
