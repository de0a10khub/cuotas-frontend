import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal Closers',
};

export default function CloserPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">{children}</div>
  );
}
