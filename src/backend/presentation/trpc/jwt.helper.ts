import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "community-hero-super-secret-key";

export interface UserTokenPayload {
  id: string;
  role: "resident" | "contractor" | "admin";
  email: string;
  sessionId: string;
}

export function signToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

export function verifyToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserTokenPayload;
  } catch (err) {
    return null;
  }
}
