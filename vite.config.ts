import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set the correct base for GitHub Pages project site deployment
  // If deploying to https://<user>.github.io/Editor/ use '/Editor/'
  // If using a custom domain (CNAME) at the root, change this to '/'
  base: '/',
})
