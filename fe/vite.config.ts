import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { compression } from 'vite-plugin-compression2';

// @devexpress/dx-react-scheduler-material-ui@4 ships an ES bundle written
// against MUI v4/v5 module layouts. These aliases point its internal imports
// at the paths MUI v7 / x-date-pickers v8 actually publish.
const devExpressMuiAliases = [
  {
    find: /^@mui\/icons-material\/esm\/(.+?)(?:\.js)?$/,
    replacement: '@mui/icons-material/$1',
  },
  {
    find: /^@mui\/x-date-pickers\/(.+)\/index(?:\.js)?$/,
    replacement: '@mui/x-date-pickers/$1',
  },
];

export default defineConfig({
  // nginx serves the .gz files with gzip_static instead of compressing per request.
  plugins: [react(), compression({
      algorithms: ['gzip'],
      include: /\.(js|css|html|svg|json)$/,
    })],
  resolve: { alias: devExpressMuiAliases },
  build: {
    outDir: 'build',
    // nginx.conf caches /static/ as immutable; keep the bundle there.
    assetsDir: 'static',
    sourcemap: false,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
