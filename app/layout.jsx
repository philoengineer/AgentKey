import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'Writ',
  description: 'Delegate scoped permissions to AI agents. Stay in control with trust tiers and human approval flows.',
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
