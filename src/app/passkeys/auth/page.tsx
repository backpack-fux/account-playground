"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { FormInput } from "../components/ui/FormInput";
import { AuthService } from "../services/auth";
import { useForm } from "../hooks/useForm";

interface AuthFormValues {
  username: string;
  email: string;
}

const initialValues: AuthFormValues = {
  username: "",
  email: "",
};

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signin");
  const {
    values,
    error,
    success,
    isLoading,
    handleChange,
    handleSubmit,
    setSuccess,
    reset,
  } = useForm<AuthFormValues>({
    initialValues,
    onSubmit: async (values) => {
      const result =
        mode === "signup"
          ? await AuthService.register(values.username, values.email)
          : await AuthService.login(values.username);

      if (result.verified) {
        if (mode === "signup") {
          setSuccess("Registration successful! You can now sign in.");
          setMode("signin");
        } else {
          setSuccess("Authentication successful!");
          // Wait a moment to show the success message
          await new Promise((resolve) => setTimeout(resolve, 1000));
          router.push("/passkeys");
        }
      } else {
        throw new Error(
          result.error ||
            `${mode === "signup" ? "Registration" : "Authentication"} failed`
        );
      }
    },
  });

  const toggleMode = () => {
    setMode((prev) => (prev === "signup" ? "signin" : "signup"));
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              {mode === "signup" ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="text-gray-600 mt-2">
              {mode === "signup"
                ? "Sign up with your passkey"
                : "Sign in with your passkey"}
            </p>
          </header>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="mb-6">
              {success}
            </Alert>
          )}

          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Username"
                name="username"
                value={values.username}
                onChange={handleChange}
                required
              />

              {mode === "signup" && (
                <FormInput
                  label="Email"
                  type="email"
                  name="email"
                  value={values.email}
                  onChange={handleChange}
                  required
                />
              )}

              <Button type="submit" isLoading={isLoading} className="w-full">
                {mode === "signup" ? "Sign Up" : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={toggleMode}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                {mode === "signup"
                  ? "Already have an account? Sign in"
                  : "Need an account? Sign up"}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
