import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '💣 GridWars Multiplayer',
  description: 'Real-time multiplayer GridWars – up to 4 players via WebSockets',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
