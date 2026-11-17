import { CHAIN_ID } from "./config";

export const IS_MAINNET = CHAIN_ID === 4663;
/** Public-facing network name. */
export const NETWORK_NAME = "Robinhood Chain";
/** Display name for a chain reported by the API. */
export const displayChainName = (_name?: string) => NETWORK_NAME;
