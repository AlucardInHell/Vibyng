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
    buildOptions: {
      keystorePath: 'vibyng.keystore',
      keystoreAlias: 'vibyng',
    },
  },
};

export default config;
