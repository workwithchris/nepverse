import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Place } from '@/core/api/types';
import { PlaceTable } from './PlaceTable';
import { readableTags } from '../lib/groups';

it('shows a place card with its location and nearby distance', () => {
  const place: Place = {
    id: 'nepal-viewpoint',
    nameEn: 'Annapurna Viewpoint',
    nameNe: 'अन्नपूर्ण',
    placeType: 'viewpoint',
    lat: 28.7,
    lng: 83.9,
    status: 'unknown',
    tags: ['tourism=viewpoint'],
    sources: [],
  };

  render(
    <MemoryRouter>
      <PlaceTable
        places={[place]}
        extra={{ header: 'Distance', render: () => '400 m' }}
      />
    </MemoryRouter>,
  );

  expect(
    screen
      .getByRole('link', { name: 'View Annapurna Viewpoint details' })
      .getAttribute('href'),
  ).toBe('/places/nepal-viewpoint');
  expect(screen.getByText('अन्नपूर्ण')).toBeTruthy();
  expect(screen.getByText('400 m')).toBeTruthy();
  expect(screen.getByText('Locator')).toBeTruthy();
});

it('cleans exported list-valued tags', () => {
  expect(
    readableTags(["instance_of=['mountain']", 'heritage_designation=[]']),
  ).toEqual(['mountain']);
});
