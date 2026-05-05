import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        // Forward /api/email/* and /api/apps/* to the EmailSenderApp .NET backend.
        // Override target via VITE_API_TARGET env var if needed.
        '/api/email': {
          target: env.VITE_API_TARGET || 'http://localhost:5050',
          changeOrigin: true,
          secure: false,
        },
        '/api/apps': {
          target: env.VITE_API_TARGET || 'http://localhost:5050',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
