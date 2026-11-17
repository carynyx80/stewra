import { CHAIN_ID } from "./config";

/** Network-aware copy. Driven by NEXT_PUBLIC_CHAIN_ID so the site never claims a network it isn't on. */
export const IS_MAINNET = CHAIN_ID === 4663;
export const NETWORK_NAME = IS_MAINNET ? "Robinhood Chain" : "Robinhood Chain testnet";
export const NETWORK_SHORT = IS_MAINNET ? "mainnet" : "testnet";
