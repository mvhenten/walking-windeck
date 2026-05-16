import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { Separator } from './ui/separator';
import { AuthBadge } from './AuthBadge';

interface AppShellProps {
  authenticated: boolean;
  children: React.ReactNode;
}

export function AppShell({ authenticated, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  const navItems = [
    { path: '/', label: 'Map' },
    { path: '/routes', label: 'Routes' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <div className="relative h-full">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between p-3">
        <button
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border bg-card text-card-foreground shadow hover:bg-accent"
          aria-label="Menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <AuthBadge authenticated={authenticated} />
      </div>

      {/* Menu drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Matshikes</SheetTitle>
          </SheetHeader>
          <Separator className="my-4" />
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <a
                  className={`block rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent ${
                    location === item.path ? 'bg-accent' : ''
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Page content */}
      {children}
    </div>
  );
}
