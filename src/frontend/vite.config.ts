import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import {viteSingleFile} from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),viteSingleFile()],
  resolve: {
    alias: {
         '@': path.resolve(__dirname, './src'), // 配置 @ 指向 src 目录
        },
    },
})
