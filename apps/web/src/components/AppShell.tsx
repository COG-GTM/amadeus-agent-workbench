// Application chrome: Amadeus-branded header with navigation and the page outlet.
// The cryptic terminal drawer is mounted here so it is available on every page.
import { NavLink, Outlet } from 'react-router';
import { Plane, Ticket, TerminalSquare } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AMADEUS_LOGO } from '@/lib/logos';
import { TerminalDrawer } from '@/components/TerminalDrawer';
import { useState } from 'react';
import { Button } from '@/components/ui';

const nav = [
  { to: '/', label: 'Search', icon: Plane },
  { to: '/bookings', label: 'Bookings', icon: Ticket },
];

export function AppShell() {
  const [terminalOpen, setTerminalOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-amadeus-800 bg-amadeus-900 text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <div className="flex items-center gap-3">
            {AMADEUS_LOGO ? (
              <img src={AMADEUS_LOGO} alt="Amadeus" className="h-6 brightness-0 invert" />
            ) : (
              <span className="text-lg font-bold tracking-tight">amadeus</span>
            )}
            <span className="hidden text-sm font-medium text-amadeus-200 sm:inline">Selling Platform Connect</span>
          </div>

          <nav className="flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-white/15 text-white' : 'text-amadeus-100 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-amadeus-200 md:inline">Office ID: LONBA0980 · Agent: HREEVES</span>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => setTerminalOpen((o) => !o)}>
              <TerminalSquare className="h-4 w-4" />
              Cryptic
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        Training demo · Not affiliated with Amadeus IT Group · Data is synthetic
      </footer>

      <TerminalDrawer open={terminalOpen} onClose={() => setTerminalOpen(false)} />
    </div>
  );
}
