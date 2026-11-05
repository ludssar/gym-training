import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// BASE_PATH viene impostato dalla pubblicazione su GitHub Pages (es. /gym-training/).
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
