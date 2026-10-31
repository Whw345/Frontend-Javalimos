import type { ZodType } from "zod";
import { copy, type ErrorCode } from "@/content/copy";
import { API_BASE_URL } from "@/lib/config";
import { apiErrorSchema } from "./schemas";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Traduce el `code` de un error del API (o cualquier error) a un mensaje de copy.ts. */
export function errorMessage(error: unknown): string {
  const code = error instanceof ApiError ? error.code : "UNKNOWN";
  return code in copy.errors ? copy.errors[code as ErrorCode] : copy.errors.UNKNOWN;
}

export async function apiRequest<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
  // Con FormData (p. ej. el audio opcional del Debate) el navegador pone el Content-Type con su boundary.
  const isForm = init?.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: isForm ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw parsed.success
      ? new ApiError(parsed.data.code, parsed.data.message, response.status)
      : new ApiError("UNKNOWN", response.statusText, response.status);
  }

  return schema.parse(body);
}
