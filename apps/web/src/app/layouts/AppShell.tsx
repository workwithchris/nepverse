import { useState, type FormEvent } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  ScrollRestoration,
  useNavigate,
} from 'react-router-dom';
import { Compass, Search } from 'lucide-react';
import { ThemeToggle } from '@/app/theme/ThemeToggle';
import { cn } from '@/core/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/places', label: 'Places', end: false },
  { to: '/trails', label: 'Trails', end: false },
];

function HeaderSearch() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    navigate(query ? `/places?q=${encodeURIComponent(query)}` : '/places');
    setValue('');
  };

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className="relative hidden w-52 lg:block"
    >
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search places"
        aria-label="Search places"
        className="h-8 w-full rounded-md border bg-card pr-3 pl-8 text-sm placeholder:text-muted-foreground"
      />
    </form>
  );
}

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-2.5"
            aria-label="NepalVerse home"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#14382f] text-white">
              <Compass className="size-4" aria-hidden="true" />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">
              NepalVerse
            </span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex min-w-0 flex-1 items-center gap-0.5"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'whitespace-nowrap rounded-full px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
                    isActive
                      ? 'bg-[#e9f4ee] text-[#205d43] dark:bg-[#19372b] dark:text-[#a9d9c4]'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <HeaderSearch />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <ScrollRestoration />

      <footer className="border-t bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-7 text-xs text-muted-foreground sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-[#377456] uppercase dark:text-[#a9d9c4]">
              NepalVerse / field atlas
            </p>
            <p className="mt-1">
              Places and trails of Nepal, mapped from open data.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/places" className="hover:text-foreground">
              Explore places
            </Link>
            <Link to="/trails" className="hover:text-foreground">
              Browse trails
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
