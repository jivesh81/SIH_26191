import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';

export const metadata: Metadata = {
  title: 'Aapda Setu | Disaster Management Decision Support',
  description: 'SIH 2026 - Hazard-based red-zone identification, vulnerable habitation prioritization, and relocation optimization for Barpeta district.',
  keywords: ['disaster management', 'flood', 'relocation', 'optimization', 'GIS', 'Barpeta', 'Assam'],
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}