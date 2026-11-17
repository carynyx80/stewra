import { randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getAddress, isAddress, verifyMessage } from "viem";
import type { FastifyRequest } from "fastify";
import { corsOriginPattern, corsOrigins, env } from "./env.js";
import { publicClient } from "./chain.js";
import { prisma } from "./db.js";
import { HttpError, badRequest } from "./errors.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const NONCE_TTL_MS = 10 * 60 * 1000;

/**
 * The message domain/URI must match the page the wallet is signing on, or wallets
 * such as MetaMask warn about a deceptive site. Use the request Origin when it is
 * an allowed origin; otherwise fall back to AUTH_DOMAIN.
 */
export function signInOrigin(origin: string | undefined): { domain: string; uri: string } {
  if (origin && (corsOrigins.includes(origin) || corsOriginPattern?.test(origin))) {
    try {
      const u = new URL(origin);
      return { domain: u.host, uri: u.origin };
    } catch {
      /* fall through */
    }
  }
  return { domain: env.AUTH_DOMAIN, uri: `https://${env.AUTH_DOMAIN}` };
}

export function buildSignInMessage(address: string, nonce: string, issuedAt: Date, chainId: number, site = signInOrigin(undefined)) {
  return [
    `${site.domain} wants you to sign in with your Ethereum account:`,
    address,
    "",
    "Sign in to Stewra. This request will not trigger a blockchain transaction or cost any gas.",
    "",
    `URI: ${site.uri}`,
    "Version: 1",
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expiration Time: ${new Date(issuedAt.getTime() + NONCE_TTL_MS).toISOString()}`,
  ].join("\n");
}

export async function createNonce(rawAddress: string, origin?: string) {
  if (!isAddress(rawAddress)) throw badRequest("Invalid wallet address");
  const address = getAddress(rawAddress);
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date();
  const message = buildSignInMessage(address, nonce, issuedAt, env.CHAIN_ID, signInOrigin(origin));
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

  // EOAs verify locally (no RPC needed); otherwise try smart-contract wallets (ERC-1271 / ERC-6492) onchain
  let valid = await verifyMessage({ address, message: record.message, signature }).catch(() => false);
  if (!valid) {
    valid = await publicClient.verifyMessage({ address, message: record.message, signature }).catch(() => false);
  }
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
