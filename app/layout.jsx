import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'AgentKey',
  description: 'Human-to-Agent Delegation for World App',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
