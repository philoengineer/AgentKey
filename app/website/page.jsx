'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const TIERS = [
  { id: 'wallet',   label: 'Wallet',   desc: 'Hold a World wallet',              lv: 1, scopes: 2  },
  { id: 'device',   label: 'Device',   desc: 'Verified on a unique device',       lv: 2, scopes: 6  },
  { id: 'passport', label: 'Passport', desc: 'Government ID confirmed',           lv: 3, scopes: 10 },
  { id: 'orb',      label: 'Orb',      desc: 'Biometric proof of personhood',     lv: 4, scopes: 14 },
];

const SCOPES_SAMPLE = [
  'read:profile', 'read:balance', 'tx:contract', 'pay:transfer',
  'social:post', 'vote:poll', 'claim:rewards', 'sign:message',
];

export default function Site() {
  const [dark, setDark] = useState(false);
  const [activeTier, setActiveTier] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDark(mq.matches);
    const stored = localStorage.getItem('writ-dark');
    if (stored !== null) setDark(stored === 'true');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    const id = setInterval(() => setActiveTier(t => (t % 4) + 1), 2200);
    return () => clearInterval(id);
  }, []);

  const s = {
    page: {
      minHeight: '100dvh',
      background: 'var(--ma-bg)',
      color: 'var(--ma-fg)',
      fontFamily: 'var(--ma-font-sans)',
      overflowX: 'hidden',
    },
    nav: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 32px',
      borderBottom: '1px solid var(--ma-border)',
      position: 'sticky',
      top: 0,
      background: 'var(--ma-bg)',
      zIndex: 10,
    },
    wordmark: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: '-0.5px',
      color: 'var(--ma-fg)',
      textDecoration: 'none',
    },
    navRight: { display: 'flex', alignItems: 'center', gap: 12 },
    themeBtn: {
      background: 'none',
      border: '1px solid var(--ma-border)',
      borderRadius: 6,
      padding: '4px 10px',
      cursor: 'pointer',
      fontSize: 14,
      color: 'var(--ma-fg-muted)',
    },
    ctaBtn: {
      background: 'var(--ma-fg)',
      color: 'var(--ma-bg)',
      border: 'none',
      borderRadius: 8,
      padding: '8px 18px',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-block',
    },
    hero: {
      maxWidth: 680,
      margin: '0 auto',
      padding: '96px 32px 80px',
      textAlign: 'center',
    },
    badge: {
      display: 'inline-block',
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--ma-fg-muted)',
      border: '1px solid var(--ma-border)',
      borderRadius: 20,
      padding: '4px 12px',
      marginBottom: 32,
      fontFamily: 'var(--ma-font-mono)',
    },
    h1: {
      fontSize: 'clamp(36px, 6vw, 60px)',
      fontWeight: 600,
      lineHeight: 1.08,
      letterSpacing: '-1.5px',
      marginBottom: 24,
      color: 'var(--ma-fg)',
    },
    sub: {
      fontSize: 18,
      lineHeight: 1.6,
      color: 'var(--ma-fg-muted)',
      maxWidth: 480,
      margin: '0 auto 40px',
    },
    heroCtas: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    outlineBtn: {
      background: 'none',
      border: '1px solid var(--ma-border)',
      borderRadius: 8,
      padding: '10px 20px',
      fontSize: 14,
      color: 'var(--ma-fg)',
      cursor: 'pointer',
      textDecoration: 'none',
      display: 'inline-block',
    },
    section: {
      maxWidth: 720,
      margin: '0 auto',
      padding: '0 32px 80px',
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--ma-fg-muted)',
      fontFamily: 'var(--ma-font-mono)',
      marginBottom: 24,
    },
    h2: {
      fontSize: 28,
      fontWeight: 600,
      letterSpacing: '-0.5px',
      marginBottom: 12,
      color: 'var(--ma-fg)',
    },
    divider: {
      border: 'none',
      borderTop: '1px solid var(--ma-border)',
      maxWidth: 720,
      margin: '0 auto 80px',
    },
    tierRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 12,
      marginTop: 28,
    },
    tierCard: (active) => ({
      padding: '16px',
      borderRadius: 10,
      border: `1px solid ${active ? 'var(--ma-fg)' : 'var(--ma-border)'}`,
      background: active ? 'var(--ma-fg)' : 'var(--ma-bg)',
      color: active ? 'var(--ma-bg)' : 'var(--ma-fg)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    }),
    tierLabel: { fontSize: 13, fontWeight: 600, marginBottom: 4 },
    tierDesc: (active) => ({ fontSize: 11, opacity: active ? 0.7 : 1, color: active ? 'var(--ma-bg)' : 'var(--ma-fg-muted)', lineHeight: 1.4 }),
    tierScopes: (active) => ({ fontSize: 11, fontFamily: 'var(--ma-font-mono)', marginTop: 8, color: active ? 'var(--ma-bg)' : 'var(--ma-accent)' }),
    scopeGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 20,
    },
    scopePill: {
      fontFamily: 'var(--ma-font-mono)',
      fontSize: 11,
      padding: '5px 10px',
      borderRadius: 6,
      border: '1px solid var(--ma-border)',
      background: 'var(--ma-bg)',
      color: 'var(--ma-fg-muted)',
    },
    steps: {
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      marginTop: 28,
    },
    step: {
      display: 'flex',
      gap: 20,
      paddingBottom: 32,
      position: 'relative',
    },
    stepNum: {
      width: 28,
      height: 28,
      borderRadius: '50%',
      border: '1px solid var(--ma-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontFamily: 'var(--ma-font-mono)',
      color: 'var(--ma-fg-muted)',
      flexShrink: 0,
      background: 'var(--ma-bg)',
      position: 'relative',
      zIndex: 1,
    },
    stepLine: {
      position: 'absolute',
      left: 14,
      top: 28,
      bottom: 0,
      width: 1,
      background: 'var(--ma-border)',
    },
    stepBody: { paddingTop: 2 },
    stepTitle: { fontSize: 15, fontWeight: 500, marginBottom: 4 },
    stepDesc: { fontSize: 13, color: 'var(--ma-fg-muted)', lineHeight: 1.6 },
    footerText: { fontSize: 12, color: 'var(--ma-fg-muted)' },
  };

  const steps = [
    { title: 'Download World App', desc: 'Get the World App on iOS or Android and create your wallet.' },
    { title: 'Verify your identity', desc: 'Earn trust tiers — from wallet ownership up to Orb biometric verification — to unlock more delegation scopes.' },
    { title: 'Open Writ', desc: 'Find Writ in the World App mini app directory and connect your verified identity.' },
    { title: 'Delegate to an agent', desc: 'Choose an AI agent, select scopes, set time limits and spending caps, then sign the credential with your World identity.' },
    { title: 'Stay in control', desc: 'Review all active grants, approve or block any action flagged for human review, and revoke access at any time.' },
  ];

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <span style={s.wordmark}>Writ</span>
        <div style={s.navRight}>
          <button style={s.themeBtn} onClick={() => { setDark(d => !d); localStorage.setItem('writ-dark', String(!dark)); }}>
            {dark ? 'Light' : 'Dark'}
          </button>
          <a href="https://world.org/download" target="_blank" rel="noopener noreferrer" style={s.ctaBtn}>
            Get World App
          </a>
        </div>
      </nav>

      <div style={s.hero}>
        <div style={s.badge}>World Mini App · Beta</div>
        <h1 style={s.h1}>Delegate to AI.<br />Stay human.</h1>
        <p style={s.sub}>
          Writ lets you grant scoped, time-limited, revocable credentials to AI agents —
          backed by World's proof of personhood.
        </p>
        <div style={s.heroCtas}>
          <a href="https://world.org/download" target="_blank" rel="noopener noreferrer" style={{ ...s.ctaBtn, padding: '12px 24px', fontSize: 15 }}>
            Open in World App
          </a>
          <Link href="/" style={s.outlineBtn} prefetch={false}>
            Preview in browser
          </Link>
        </div>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <div style={s.sectionLabel}>Trust tiers</div>
        <h2 style={s.h2}>More verification, more power.</h2>
        <p style={{ fontSize: 14, color: 'var(--ma-fg-muted)', lineHeight: 1.6, marginBottom: 0 }}>
          Each tier you complete unlocks additional scopes you can delegate. Higher tiers
          require stronger identity proofs — your choice how far you go.
        </p>
        <div style={s.tierRow}>
          {TIERS.map(t => {
            const active = activeTier === t.lv;
            return (
              <div key={t.id} style={s.tierCard(active)} onClick={() => setActiveTier(t.lv)}>
                <div style={s.tierLabel}>{t.label}</div>
                <div style={s.tierDesc(active)}>{t.desc}</div>
                <div style={s.tierScopes(active)}>{t.scopes} scopes</div>
              </div>
            );
          })}
        </div>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <div style={s.sectionLabel}>Scopes</div>
        <h2 style={s.h2}>Fine-grained permissions.</h2>
        <p style={{ fontSize: 14, color: 'var(--ma-fg-muted)', lineHeight: 1.6 }}>
          Every credential specifies exactly what an agent can and cannot do — time-bounded,
          rate-limited, and revocable at any moment.
        </p>
        <div style={s.scopeGrid}>
          {SCOPES_SAMPLE.map(sc => (
            <div key={sc} style={s.scopePill}>{sc}</div>
          ))}
        </div>
      </div>

      <hr style={s.divider} />

      <div style={s.section}>
        <div style={s.sectionLabel}>How it works</div>
        <h2 style={s.h2}>Four steps to safe delegation.</h2>
        <div style={s.steps}>
          {steps.map((step, i) => (
            <div key={i} style={s.step}>
              {i < steps.length - 1 && <div style={s.stepLine} />}
              <div style={s.stepNum}>{String(i + 1).padStart(2, '0')}</div>
              <div style={s.stepBody}>
                <div style={s.stepTitle}>{step.title}</div>
                <div style={s.stepDesc}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--ma-border)', padding: '40px 32px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--ma-fg-muted)', marginBottom: 24 }}>
          Built on World's proof of personhood. Available now in World App.
        </p>
        <a href="https://world.org/download" target="_blank" rel="noopener noreferrer" style={{ ...s.ctaBtn, padding: '12px 28px', fontSize: 15 }}>
          Get World App to use Writ
        </a>
      </div>

      <div style={{ borderTop: '1px solid var(--ma-border)', padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={s.footerText}>Writ — Human-to-Agent Delegation</span>
        <span style={{ ...s.footerText, fontFamily: 'var(--ma-font-mono)' }}>beta</span>
      </div>
    </div>
  );
}
