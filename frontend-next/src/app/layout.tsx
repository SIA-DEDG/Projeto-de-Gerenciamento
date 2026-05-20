import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gestor DEDG - Sistema de Gerenciamento de Atividades',
  description: 'Sistema de Gerenciamento de Atividades SIA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
