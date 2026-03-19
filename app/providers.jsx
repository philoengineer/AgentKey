'use client';

import { MiniKitProvider } from '@worldcoin/minikit-js/minikit-provider';

export default function Providers({ children }) {
  return (
    <MiniKitProvider appId={process.env.NEXT_PUBLIC_APP_ID}>
      {children}
    </MiniKitProvider>
  );
}
