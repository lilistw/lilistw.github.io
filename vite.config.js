import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@util': '/src/util',
      '@core': '/src/core'
    }
  }
})
