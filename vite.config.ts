import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: true },
  build: {
    // Split vendor libraries into separate chunks so we don't ship one huge
    // JS file (a large single transfer is what triggers ERR_HTTP2_PROTOCOL_ERROR
    // on some CDNs/edges, and it caches worse too).
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
