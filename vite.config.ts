import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true, // Crucial: Wipes the folder before building
      sourcemap: false,  // Optimizes production build size
    },
    plugins: [react()],
    define: {
      // Injects a timestamp so we can debug versioning in the console later
      '__BUILD_TIME__': JSON.stringify(new Date().toISOString())
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
