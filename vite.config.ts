import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Published at the root of the custom domain quenifer.com (see public/CNAME)
  base: '/',
  plugins: [react(), tailwindcss()],
})
