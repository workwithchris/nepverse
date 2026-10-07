import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from '@/app/layouts/AppShell';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage';
import { PlacesPage } from '@/features/places/pages/PlacesPage';
import { PlaceDetailPage } from '@/features/places/pages/PlaceDetailPage';
import { TrailsPage } from '@/features/trails/pages/TrailsPage';
import { TrailDetailPage } from '@/features/trails/pages/TrailDetailPage';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'places', element: <PlacesPage /> },
      { path: 'places/:id', element: <PlaceDetailPage /> },
      { path: 'trails', element: <TrailsPage /> },
      { path: 'trails/:id', element: <TrailDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
