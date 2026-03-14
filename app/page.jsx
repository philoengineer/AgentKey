'use client';

import { useState, useEffect } from 'react';
import AgentKey from '../agentkey';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <AgentKey />;
}
