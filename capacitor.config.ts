import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hexfire.royalspin',
  appName: 'Hexfire Royal Spin',
  webDir: 'dist',
  server: {
    url: 'http://192.168.1.195:3000', // Local IP for Physical Device
    cleartext: true
  }
};

export default config;
