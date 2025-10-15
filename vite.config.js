import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const base = process.env.NODE_ENV === 'production' ? '/jason-driver-FE/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
