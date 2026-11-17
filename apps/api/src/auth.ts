import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getAddress, isAddress, verifyMessage } from "viem";
import type { FastifyRequest } from "fastify";
import { env } from "./env.js";
import { prisma } from "./db.js";
import { HttpError, badRequest } from "./errors.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const NONCE_TTL_MS = 10 * 60 * 1000;

export function buildSignInMessage(address: string, nonce: string, issuedAt: Date, chainId: number) {
  return [
    `${env.AUTH_DOMAIN} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to Stewra. This request will not trigger a blockchain transaction or cost any gas.",
    "",
    `URI: https://${env.AUTH_DOMAIN}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
  ].join("\n");
}

export async function createNonce(rawAddress: string) {
  if (!isAddress(rawAddress)) throw badRequest("Invalid wallet address");
  const address = getAddress(rawAddress);
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const message = buildSignInMessage(address, nonce, issuedAt, env.CHAIN_ID);
  await prisma.authNonce.create({
    data: { nonce, address, message, expiresAt: new Date(issuedAt.getTime() + NONCE_TTL_MS) },
  });
  return { nonce, message };
}

/** Verify a signed nonce message. Each nonce is single-use (replay protection). */
export async function verifySignIn(rawAddress: string, nonce: string, signature: `0x${string}`) {
  if (!isAddress(rawAddress)) throw badRequest("Invalid wallet address");
  const address = getAddress(rawAddress);
  const record = await prisma.authNonce.findUnique({ where: { nonce } });
  if (!record || record.address !== address) throw new HttpError(401, "Unknown sign-in request", "unauthorized");
  if (record.usedAt) throw new HttpError(401, "Sign-in request already used", "unauthorized");
  if (record.expiresAt < new Date()) throw new HttpError(401, "Sign-in request expired", "unauthorized");

  // mark used before verifying so a nonce can never be accepted twice, even concurrently
  const claimed = await prisma.authNonce.updateMany({ where: { nonce, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) throw new HttpError(401, "Sign-in request already used", "unauthorized");

  const valid = await verifyMessage({ address, message: record.message, signature });
  if (!valid) throw new HttpError(401, "Signature does not match wallet", "unauthorized");

  const user = await prisma.user.upsert({ where: { address }, create: { address }, update: {} });
  const token = await new SignJWT({ sub: user.id, addr: address })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("stewra")
    .sign(secret);
  return { token, user };
}

export interface AuthUser {
  id: string;
  address: `0x${string}`;
}

export async function verifyToken(token: string): Promise<AuthUser> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: "stewra" });
    if (typeof payload.sub !== "string" || typeof payload.addr !== "string") throw new Error("bad token");
    return { id: payload.sub, address: payload.addr as `0x${string}` };
  } catch {
    throw new HttpError(401, "Invalid or expired session", "unauthorized");
  }
}

export async function optionalUser(req: FastifyRequest): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return verifyToken(header.slice(7));
}

export async function requireUser(req: FastifyRequest): Promise<AuthUser> {
  const user = await optionalUser(req);
  if (!user) throw new HttpError(401, "Sign in with your wallet first", "unauthorized");
  return user;
}
