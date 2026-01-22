import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
    server: {
        port: 5173,
        host: '0.0.0.0',
    },
    plugins: [
        react(),
        electron([
            {
                // Main process entry file
                entry: 'electron/main.ts',
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        rollupOptions: {
                            external: ['electron'],
                        },
                    },
                },
            },
            {
                // Preload script
                entry: 'electron/preload.ts',
                onstart(options) {
                    // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete
                    options.reload();
                },
                vite: {
                    build: {
                        outDir: 'dist-electron',
                    },
                },
            },
        ]),
        renderer(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './components'),
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
});
