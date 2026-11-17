"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "@wagmi/core";
import { robinhoodMainnet, robinhoodTestnet } from "@/lib/chain";
import { AuthProvider } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { RippleLayer } from "@/components/liquid/RippleLayer";

const wagmiConfig = createConfig({
  chains: [robinhoodTestnet, robinhoodMainnet],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [robinhoodTestnet.id]: http("https://rpc.testnet.chain.robinhood.com"),
    [robinhoodMainnet.id]: http("https://rpc.mainnet.chain.robinhood.com"),
  },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
          },
        },
      }),
  );
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <RippleLayer />
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
