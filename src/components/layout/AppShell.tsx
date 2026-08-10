'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/lib/store';
import { theme } from '@/styles/theme';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  // Close mobile sidebar on route change
  useEffect(() => {
    useSidebar.getState().setMobileOpen(false);
  }, [pathname]);

  // Skip shell for login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const sidebarWidth = collapsed ? theme.sidebar.collapsedWidth : theme.sidebar.expandedWidth;

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.colors.background }}>
      <Sidebar />

      {/* Main wrapper offset by sidebar width on desktop */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300 ease-in-out"
        style={{ marginLeft: 0 }} // sidebar is fixed/overlay
      >
        <Header />

        <main className={cn('flex-1 p-4 md:p-6')}>
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer
          className="mt-auto px-4 py-3 text-center text-xs border-t"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.textDisabled,
          }}
        >
          UltraBot Web Trading Terminal · Built with Next.js
        </footer>
      </div>
    </div>
  );
}
