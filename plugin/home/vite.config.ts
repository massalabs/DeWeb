import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default ({ mode }: any) => {
  // loadEnv(mode, process.cwd()) will load the .env files depending on the mode
  // import.meta.env.BASE_URL available here with: process.env.BASE_URL
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return defineConfig({
    plugins: [react()],
    base: process.env.VITE_BASE_APP,
    build: {
      outDir: '../int/api/html/dist',
    },
  })
}
