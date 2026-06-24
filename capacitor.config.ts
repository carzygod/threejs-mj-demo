import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pl.pwmarcz.autotable.android',
  appName: 'Autotable',
  webDir: 'build',
  android: {
    allowMixedContent: true,
  },
};

export default config;
