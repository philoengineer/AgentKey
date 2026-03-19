'use client';

import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';

export default function Providers({ children }) {
  return (
    <MiniKitProvider>
      {children}
    </MiniKitProvider>
  );
}
