'use client';

import { useEffect } from 'react';
import './globals.css';

export default function RootLayout({ children }) {
  useEffect(() => {
    try {
      const { MiniKit } = require('@worldcoin/minikit-js');
      const appId = process.env.NEXT_PUBLIC_APP_ID;
      MiniKit.install(appId);
    } catch (e) {
      console.warn('MiniKit not available, running in dev mode');
    }
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
