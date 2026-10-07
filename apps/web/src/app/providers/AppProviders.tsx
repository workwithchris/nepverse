import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@/app/theme/ThemeProvider';
import { router } from '@/app/router';
import { queryClientOptions } from './query';

const queryClient = new QueryClient({ defaultOptions: queryClientOptions });

export function AppProviders() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
