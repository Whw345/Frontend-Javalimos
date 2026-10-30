// Thrown instead of database errors, so callers never depend on the engine.
// The original error stays in `cause` for server logs.
export class DataError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DataError";
  }
}
