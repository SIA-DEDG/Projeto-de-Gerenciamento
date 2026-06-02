import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Task SIA',
  description: 'Task SIA — Gestão de Atividades e Projetos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
