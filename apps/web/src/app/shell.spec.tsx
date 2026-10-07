import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { queryClientOptions } from './providers/query';
import { routes } from './router';
import { ThemeProvider } from './theme/ThemeProvider';

function renderRoute(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: queryClientOptions });
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe('app shell', () => {
  beforeEach(() => vi.stubGlobal('scrollTo', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('renders the branding and the main navigation', () => {
    renderRoute('/places');

    expect(screen.getByText('NepalVerse')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Places' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Trails' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Places' })).toBeTruthy();
  });

  it('renders the 404 page for unknown routes', () => {
    renderRoute('/does-not-exist');

    expect(screen.getByText('404')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Page not found' }),
    ).toBeTruthy();
  });

  it('renders the dashboard overview on the index route', () => {
    renderRoute('/');

    expect(
      screen.getByRole('heading', { name: 'Nepal, place by place' }),
    ).toBeTruthy();
    expect(screen.getByText('Total places')).toBeTruthy();
    expect(
      screen.getByRole('complementary', { name: 'Category breakdown' }),
    ).toBeTruthy();
  });
});
