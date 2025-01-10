import { useState, useCallback } from "react";

interface FormState<T> {
  values: T;
  error: string | null;
  success: string | null;
  isLoading: boolean;
}

interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void>;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  onSubmit,
}: UseFormOptions<T>) {
  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    error: null,
    success: null,
    isLoading: false,
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      values: { ...prev.values, [name]: value },
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setFormState((prev) => ({ ...prev, error }));
  }, []);

  const setSuccess = useCallback((success: string | null) => {
    setFormState((prev) => ({ ...prev, success }));
  }, []);

  const resetMessages = useCallback(() => {
    setFormState((prev) => ({ ...prev, error: null, success: null }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      resetMessages();
      setFormState((prev) => ({ ...prev, isLoading: true }));

      try {
        await onSubmit(formState.values);
      } catch (error) {
        setFormState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "An error occurred",
        }));
      } finally {
        setFormState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [formState.values, onSubmit, resetMessages]
  );

  const reset = useCallback(() => {
    setFormState({
      values: initialValues,
      error: null,
      success: null,
      isLoading: false,
    });
  }, [initialValues]);

  return {
    values: formState.values,
    error: formState.error,
    success: formState.success,
    isLoading: formState.isLoading,
    handleChange,
    handleSubmit,
    setError,
    setSuccess,
    reset,
    resetMessages,
  };
}
