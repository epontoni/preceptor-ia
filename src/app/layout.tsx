// src/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'preceptor.ia | Digitalización de Legajos',
  description:
    'Sistema inteligente de matriculación escolar, generación automatizada de documentación en PDF.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} min-h-screen flex flex-col antialiased selection:bg-indigo-500 selection:text-white`}>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>preceptor-ia © 2026 - Plataforma de Automatización Escolar</span>
            <div className="flex items-center gap-4">
              <span>Integración Legajo Digital v2.4</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
