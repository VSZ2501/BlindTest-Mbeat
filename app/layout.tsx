import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BlindTest-Mbeat',
  description: 'Blind test multijoueur sur playlist YouTube : mode écrit ou buzzer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#0d0b16] antialiased selection:bg-cyan-500/30">
        {children}
      </body>
    </html>
  );
}
