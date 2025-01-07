import { useState, useEffect } from "react";
import { PasskeyLocalStorageFormat } from "../types";
import { createPasskey, toLocalStorageFormat } from "../utils";
import { setItem, getJsonItem } from "../storage";

const PASSKEY_STORAGE_KEY = "passkey";

export function usePasskey() {
  const [passkey, setPasskey] = useState<PasskeyLocalStorageFormat | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load passkey from localStorage on mount
    const storedPasskey =
      getJsonItem<PasskeyLocalStorageFormat>(PASSKEY_STORAGE_KEY);
    if (storedPasskey) {
      setPasskey(storedPasskey);
    }
  }, []);

  const createNewPasskey = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const newPasskey = await createPasskey();
      const storageFormat = toLocalStorageFormat(newPasskey);

      // Store in localStorage
      setItem(PASSKEY_STORAGE_KEY, storageFormat);
      setPasskey(storageFormat);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error occurred");
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const clearPasskey = () => {
    localStorage.removeItem(PASSKEY_STORAGE_KEY);
    setPasskey(null);
  };

  return {
    passkey,
    error,
    isLoading,
    createPasskey: createNewPasskey,
    clearPasskey,
  };
}
