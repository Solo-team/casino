import dotenv from "dotenv";
import jwt, { Secret } from "jsonwebtoken";

dotenv.config();

const jwtSecretFromEnv = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "7d") as string;

if (!jwtSecretFromEnv) {
  throw new Error("JWT_SECRET environment variable is required for token generation and validation");
}

const JWT_SECRET: Secret = jwtSecretFromEnv;

export interface TokenPayload {
  userId: string;
  name: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

