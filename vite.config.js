import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
  },
  assetsInclude: ['**/*.obj'], // Ensure OBJ files are handled as assets
  build: {
    assetsInlineLimit: 0, // Prevent inlining of model files
  }
}); 