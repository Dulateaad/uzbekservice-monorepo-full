import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Плагин: при каждом билде создаёт version.json с уникальным хэшем
function versionPlugin(): Plugin {
  // Генерируем версию ОДИН раз при загрузке конфига
  const BUILD_VERSION = Date.now().toString(36);

  return {
    name: 'version-plugin',
    buildStart() {
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
      fs.writeFileSync(
        path.join(publicDir, 'version.json'),
        JSON.stringify({ version: BUILD_VERSION, built: new Date().toISOString() })
      );
    },
    transformIndexHtml() {
      return [
        {
          tag: 'script',
          attrs: { type: 'text/javascript' },
          children: `window.__APP_VERSION__="${BUILD_VERSION}";`,
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [react(), versionPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
