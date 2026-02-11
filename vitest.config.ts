import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import * as path from 'node:path'

export default defineConfig({
    plugins: [react()],
    test: {
        exclude: ["tests/playwright", '**/node_modules/**', '**/.git/**'],
        environment: 'jsdom',
    },
    resolve: {
        alias: {
            '@renderer': path.resolve(__dirname, './src/renderer/src'),
            '@shared': path.resolve(__dirname, './src/shared')
        }
    }
})
