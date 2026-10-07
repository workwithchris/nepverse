import { fireEvent, render, screen } from '@testing-library/react';
import type { Trail } from '@/core/api/types';
import { TrailsPage } from './TrailsPage';

vi.mock('@/features/trails/api', () => ({
  useTrails: () => ({
    data: {
      items: [
        { id: 'circuit', name: 'Annapurna Circuit', difficulty: 'extreme' },
        { id: 'walk', name: 'Heritage Walk', difficulty: 'easy' },
      ],
      total: 2,
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/features/trails/components/TrailCard', () => ({
  TrailCard: ({ trail }: { trail: Trail }) => <article>{trail.name}</article>,
}));

it('filters routes by name and difficulty', () => {
  render(<TrailsPage />);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Find a route' }), {
    target: { value: 'heritage' },
  });
  expect(screen.getByText('Heritage Walk')).toBeTruthy();
  expect(screen.queryByText('Annapurna Circuit')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /extreme/i }));
  expect(screen.getByText('No routes match')).toBeTruthy();
});
