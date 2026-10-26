import * as SecureStore from 'expo-secure-store';

/**
 * Supabase Auth's session storage: the Keychain (iOS) and Keystore-encrypted storage (Android) through
 * expo-secure-store. A session (two JWTs plus the user and its identities) can pass the ~2 KB a single secure
 * value safely holds, so values are split into chunks: `<key>` holds the chunk count, `<key>.<i>` the chunks.
 * Readable only after the device's first unlock, never synced to iCloud or another device.
 */
export const CHUNK = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

async function count(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(key, OPTIONS);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const n = await count(key);
    if (!n) return null;
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`, OPTIONS);
      if (part === null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const old = await count(key);
    const n = Math.max(1, Math.ceil(value.length / CHUNK));
    for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), OPTIONS);
    await SecureStore.setItemAsync(key, String(n), OPTIONS);
    for (let i = n; i < old; i++) await SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS);
  },
  async removeItem(key: string): Promise<void> {
    const n = await count(key);
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${key}.${i}`, OPTIONS);
    await SecureStore.deleteItemAsync(key, OPTIONS);
  },
};
