/**
 * A caught value is `unknown`. JavaScript lets any value be thrown, so reading
 * `.message` off it was only ever safe because the binding was typed `any`.
 * These readers keep call sites free of `any` without claiming to know more
 * about the value than it actually carries.
 */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return String(error);
}

/**
 * Driver and filesystem errors carry a string code such as "ENOENT" or a
 * PostgreSQL SQLSTATE. A non-string code is reported as missing rather than
 * coerced, so an equality check never matches something it should not.
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

export function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}
