import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hexfire.royalspin',
  appName: 'Hexfire Royal Spin',
  webDir: 'dist',
  server: {
    url: 'http://10.0.2.2:3000', // Android Emulator localhost
    cleartext: true
  }
};

export default config;
