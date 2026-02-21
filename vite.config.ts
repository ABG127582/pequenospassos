import path from 'path';
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import fs from 'fs';

export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
    const env = loadEnv(mode, '.', '');

    // Get all .html files from the public directory to include them in the build
    const publicDir = path.resolve(__dirname, 'public');
    const htmlFiles = fs.existsSync(publicDir) ? fs.readdirSync(publicDir).filter(file => file.endsWith('.html')) : [];
    
    // Map them to their paths for rollup input
    const inputFiles: { [key: string]: string } = {
        main: path.resolve(__dirname, 'index.html'),
    };
    
    htmlFiles.forEach(file => {
        const name = file.replace('.html', '');
        inputFiles[name] = path.resolve(__dirname, 'public', file);
    });

    return {
      base: './',
      root: './', // Ensure root is current directory
      plugins: [basicSsl()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          input: inputFiles,
          output: {
            entryFileNames: `assets/[name]-[hash].js`,
            chunkFileNames: `assets/[name]-[hash].js`,
            assetFileNames: `assets/[name]-[hash].[ext]`,
          }
        }
      }
    };
});
