import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIA Gestão - Portfólio de Projetos',
  description: 'Sistema de Gerenciamento de Atividades SIA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
