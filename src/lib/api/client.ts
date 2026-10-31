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
  if (error instanceof TypeError) return copy.errors.NETWORK_ERROR;

  if (!(error instanceof ApiError)) return copy.errors.UNKNOWN;

  if (error.code in copy.errors) return copy.errors[error.code as ErrorCode];

  const statusMessages: Record<number, ErrorCode> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "INVALID_INPUT",
    500: "SERVICE_UNAVAILABLE",
    502: "SERVICE_UNAVAILABLE",
    503: "SERVICE_UNAVAILABLE",
  };

  return copy.errors[statusMessages[error.status] ?? "UNKNOWN"];
}

export async function apiRequest<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
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
