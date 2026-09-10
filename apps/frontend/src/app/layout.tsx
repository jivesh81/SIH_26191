import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aapda Setu | Disaster Management Decision Support',
  description: 'SIH 2026 - Hazard-based red-zone identification, vulnerable habitation prioritization, and relocation optimization for Barpeta district.',
  keywords: ['disaster management', 'flood', 'relocation', 'optimization', 'GIS', 'Barpeta', 'Assam'],
};

// Force dynamic rendering for all pages in this layout
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50">{children}</body>
    </html>
  );
}