/**
 * Sets an item in the local storage.
 * @param key - The key to set the item with.
 * @param value - The value to be stored. It will be converted to a string using JSON.stringify.
 * @template T - The type of the value being stored.
 */
export function setItem<T>(key: string, value: T) {
  // to prevent silly mistakes with double stringifying
  if (typeof value === "string") {
    localStorage.setItem(key, value);
  } else {
    localStorage.setItem(
      key,
      JSON.stringify(value, (_key, value) =>
        typeof value === "bigint" ? "0x" + value.toString(16) : value
      )
    );
  }
}

/**
 * Retrieves the value associated with the specified key from the local storage.
 *
 * @param key - The key of the item to retrieve.
 * @returns The value associated with the key, or null if the key does not exist.
 */
export function getItem(key: string): string | null {
  return localStorage.getItem(key);
}

/**
 * Retrieves and parses a JSON value from local storage.
 * @param key - The key to retrieve the value for.
 * @returns The parsed value, or null if the key doesn't exist or the value is invalid JSON.
 */
export function getJsonItem<T>(key: string): T | null {
  const item = localStorage.getItem(key);
  if (!item) return null;

  try {
    return JSON.parse(item, (_key, value) => {
      if (typeof value === "string" && value.startsWith("0x")) {
        // Try to convert hex strings back to bigint
        try {
          return BigInt(value);
        } catch {
          return value;
        }
      }
      return value;
    }) as T;
  } catch {
    return null;
  }
}
