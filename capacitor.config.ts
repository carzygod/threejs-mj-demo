import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pl.pwmarcz.autotable.android',
  appName: '江南麻将3D',
  webDir: 'build',
  android: {
    allowMixedContent: true,
  },
};

export default config;
