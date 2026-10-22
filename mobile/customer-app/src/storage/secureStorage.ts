class UniversalSecureStorage {
  private memoryFallback = new Map<string, string>();
  private secureStoreModule: any = null;
  private isLoaded = false;

  private async getModule() {
    if (!this.isLoaded) {
      try {
        this.secureStoreModule = await import('expo-secure-store');
      } catch {
        this.secureStoreModule = null;
      }
      this.isLoaded = true;
    }
    return this.secureStoreModule;
  }

  async setItem(key: string, value: string): Promise<void> {
    const SecureStore = await this.getModule();
    if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
      try {
        await SecureStore.setItemAsync(key, value);
        return;
      } catch {
        // Fallback to memory store if device keychain is locked/unsupported
      }
    }
    this.memoryFallback.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    const SecureStore = await this.getModule();
    if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
      try {
        const result = await SecureStore.getItemAsync(key);
        if (result !== null) return result;
      } catch {
        // Fallback to memory store
      }
    }
    return this.memoryFallback.get(key) || null;
  }

  async removeItem(key: string): Promise<void> {
    const SecureStore = await this.getModule();
    if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Ignore
      }
    }
    this.memoryFallback.delete(key);
  }
}

export const secureStorage = new UniversalSecureStorage();
