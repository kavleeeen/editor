import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set the correct base for GitHub Pages project site deployment
  // If deploying to https://<user>.github.io/Editor/ use '/Editor/'
  // If using a custom domain (CNAME) at the root, change this to '/'
  // Use relative base for GitHub Pages robustness (works for custom domains and subpaths)
  base: '/',
  build: {
    // Ensure proper MIME types for JavaScript modules
    rollupOptions: {
      output: {
        // Use relative paths to avoid MIME type issues
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})
