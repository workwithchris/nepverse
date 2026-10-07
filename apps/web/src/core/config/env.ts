const env = import.meta.env as { VITE_API_BASE_URL?: string };

export const API_BASE_URL: string = env.VITE_API_BASE_URL ?? '/data';
