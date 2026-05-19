import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MedGuard360 — Medicaid Fraud Prevention Platform',
  description: 'AI-assisted, human-verified Medicaid fraud prevention',
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
