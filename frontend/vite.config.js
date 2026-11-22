import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/shorten': 'http://localhost:3000',
      '/test': 'http://localhost:3000',
      '/analytics': 'http://localhost:3000',
    },
  },
});
