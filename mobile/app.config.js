// Adds a separate "TLEQuest Test" app that installs NEXT TO the real TLEQuest app.
// app.json stays exactly as it is. This file only changes a few values when APP_VARIANT=dev.
// Real builds (preview / production) do not set APP_VARIANT, so they are not affected.
module.exports = ({ config }) => {
  const isDev = process.env.APP_VARIANT === 'dev';
  if (!isDev) return config;

  return {
    ...config,
    name: 'TLEQuest Test',
    scheme: 'tlequest-test',
    android: {
      ...config.android,
      package: 'com.tlequest.app.dev', // different id = a second app, the real one is untouched
    },
  };
};