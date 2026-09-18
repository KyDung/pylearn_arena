import jwt from "jsonwebtoken";
import type { UserRole } from "@/types";

export interface TokenPayload {
  userId: number;
  username: string;
  role: UserRole;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret !== "change-this-secret" && secret !== "pylearn-secret-key-change-in-production") {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be configured with a private value in production.");
  }
  return secret || "pylearn-secret-key-change-in-production";
}

export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { algorithm: "HS256", expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  const secret = getSecret();
  try {
    const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
    if (
      typeof payload === "string" ||
      !Number.isSafeInteger(payload.userId) || payload.userId <= 0 ||
      typeof payload.username !== "string" ||
      !["admin", "teacher", "student"].includes(payload.role)
    ) return null;
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
