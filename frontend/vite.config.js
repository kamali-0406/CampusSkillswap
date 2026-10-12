import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: { global: 'globalThis' }, // required by amazon-cognito-identity-js in the browser
  optimizeDeps: { esbuildOptions: { define: { global: 'globalThis' } } },
  server: { port: 5173 }
});
