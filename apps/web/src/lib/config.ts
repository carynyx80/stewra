export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 46630);
