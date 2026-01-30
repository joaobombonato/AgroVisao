import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
            manifest: {
                name: 'Fazenda São Caetano - Gestão Rural',
                short_name: 'Fazenda SC',
                description: 'Sistema de Gestão Agrícola e Registros Operacionais',
                theme_color: '#10b981',
                background_color: '#f9fafb',
                display: 'standalone',
                start_url: '.',
                icons: [
                    {
                        src: 'icon-192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'icon-512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            }
        })
    ],
    server: {
        port: 3000,
        proxy: {
            '/copernicus-auth': {
                target: 'https://identity.dataspace.copernicus.eu',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/copernicus-auth/, '/auth/realms/CDSE/protocol/openid-connect/token'),
                secure: false
            },
            '/copernicus-api': {
                target: 'https://sh.dataspace.copernicus.eu',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/copernicus-api/, '/api/v1'),
                secure: false
            }
        }
    },
});
