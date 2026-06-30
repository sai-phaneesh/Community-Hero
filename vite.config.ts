import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks to reduce main bundle
            react: ['react', 'react-dom', 'react-router-dom'],
            ui: ['lucide-react', 'sonner'],
            leaflet: ['leaflet'],
            trpc: ['@trpc/react-query', '@trpc/client'],
            tanstack: ['@tanstack/react-query'],
          },
        },
      },
      chunkSizeWarningLimit: 850, // Increase threshold to 850 kB
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          dead_code: true,
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        // Exclude db.json from file watcher to prevent continuous page reloads
        ignored: ['**/node_modules/**', '**/db.json', '**/.git/**'],
      },
    },
  };
});
