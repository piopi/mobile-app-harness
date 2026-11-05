// The native fingerprint (runtimeVersion policy `fingerprint`) must be the same on every machine: a laptop, CI
// (release.yml compares it with EAS's builds, docs/release.md) and EAS's build servers. `buildCacheProvider` in
// app.config.ts names a folder in the home directory, which differs on each machine and changes nothing native, so
// it is left out. Without this, every release looks like a native change and ships a store build.
/** @type {import('expo/fingerprint').Config} */
const config = {
  fileHookTransform: (source, chunk) => {
    if (source.type === 'contents' && source.id === 'expoConfig' && typeof chunk === 'string') {
      const expoConfig = JSON.parse(chunk);
      delete expoConfig.buildCacheProvider;
      return JSON.stringify(expoConfig);
    }
    return chunk;
  },
};

module.exports = config;
