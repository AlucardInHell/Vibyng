import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vibyng.app',
  appName: 'Vibyng',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    url: 'https://vibyng-production.up.railway.app',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
