import { PublicKeyCoordinates } from "./types";

/**
 * Storage keys used in the application
 */
export const STORAGE_KEYS = {
  PASSKEY: "passkey",
  SAFE_ACCOUNT: "safe_account",
} as const;

/**
 * Base storage interface for all stored items
 */
interface StorageItem {
  version: number;
  updatedAt: number;
}

/**
 * Passkey storage format
 */
export interface PasskeyStorage extends StorageItem {
  rawId: string;
  pubkeyCoordinates: PublicKeyCoordinates;
}

/**
 * Safe account storage format
 */
export interface SafeAccountStorage extends StorageItem {
  owners: PublicKeyCoordinates[];
  eip7212WebAuthnPrecompileVerifierForSharedSigner: string;
}

/**
 * Type mapping for storage items
 */
export interface StorageTypes {
  [STORAGE_KEYS.PASSKEY]: PasskeyStorage;
  [STORAGE_KEYS.SAFE_ACCOUNT]: SafeAccountStorage;
}

/**
 * Storage manager class with type safety and error handling
 */
class StorageManager {
  private static instance: StorageManager;
  private currentVersion = 1;

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
   * Sets an item in localStorage with versioning and timestamp
   */
  setItem<K extends keyof StorageTypes>(
    key: K,
    value: Omit<StorageTypes[K], keyof StorageItem>
  ) {
    try {
      const item: StorageTypes[K] = {
        ...(value as any),
        version: this.currentVersion,
        updatedAt: Date.now(),
      };
      localStorage.setItem(key, this.serialize(item));
    } catch (error) {
      console.error(`Error setting ${key} in localStorage:`, error);
      throw new Error(`Failed to store ${key} in localStorage`);
    }
  }

  /**
   * Gets an item from localStorage with type checking
   */
  getItem<K extends keyof StorageTypes>(key: K): StorageTypes[K] | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = this.deserialize<StorageTypes[K]>(item);

      // Version check could be added here if needed
      // if (parsed.version !== this.currentVersion) {
      //   this.migrate(key, parsed);
      // }

      return parsed;
    } catch (error) {
      console.error(`Error getting ${key} from localStorage:`, error);
      return null;
    }
  }

  /**
   * Removes an item from localStorage
   */
  removeItem(key: keyof StorageTypes): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  }

  /**
   * Clears all items from localStorage
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  }

  /**
   * Serializes a value with BigInt support
   */
  private serialize(value: unknown): string {
    return JSON.stringify(value, (_, value) =>
      typeof value === "bigint" ? `bigint:${value.toString()}` : value
    );
  }

  /**
   * Deserializes a value with BigInt support
   */
  private deserialize<T>(value: string): T {
    return JSON.parse(value, (_, value) => {
      if (typeof value === "string" && value.startsWith("bigint:")) {
        return BigInt(value.slice(7));
      }
      return value;
    });
  }

  // Migration logic could be added here if needed
  // private migrate<K extends keyof StorageTypes>(key: K, value: StorageTypes[K]): void {
  //   // Migration logic
  // }
}

// Export singleton instance
export const storage = StorageManager.getInstance();
