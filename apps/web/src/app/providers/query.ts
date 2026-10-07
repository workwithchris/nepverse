import type { DefaultOptions } from '@tanstack/react-query';

export const queryClientOptions: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  },
};
