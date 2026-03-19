'use client';

import { useState, useEffect } from 'react';
import Writ from '../writ';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [inWorldApp, setInWorldApp] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      const { MiniKit } = require('@worldcoin/minikit-js');
      setInWorldApp(MiniKit.isInstalled());
    } catch (e) {
      setInWorldApp(false);
    }
  }, []);

  if (!mounted) return null;

  return (
    <>
      {!inWorldApp && (
        <div style={{
          background: 'var(--ma-bg-subtle)',
          borderBottom: '1px solid var(--ma-border)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 12,
          color: 'var(--ma-fg-muted)',
          fontFamily: 'var(--ma-font-sans)',
        }}>
          <span>
            <span style={{ color: 'var(--ma-fg)', fontWeight: 500 }}>Writ</span>
            {' '}is a World Mini App. Open it in{' '}
            <span style={{ color: 'var(--ma-fg)', fontWeight: 500 }}>World App</span>
            {' '}for full functionality — verification and signing are simulated in browser.
          </span>
          <a
            href="https://world.org/download"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flexShrink: 0,
              fontSize: 11,
              color: 'var(--ma-fg)',
              border: '1px solid var(--ma-border)',
              borderRadius: 6,
              padding: '4px 10px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Get World App →
          </a>
        </div>
      )}
      <Writ />
    </>
  );
}
