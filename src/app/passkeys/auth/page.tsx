"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { startAuthentication } from "@simplewebauthn/browser";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

export default function AuthPage() {
  const [mode, setMode] = useState<"signup" | "signin">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // 1. Get registration options from server
      const optionsRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email }),
      });

      if (!optionsRes.ok) {
        const error = await optionsRes.json();
        throw new Error(error.error || "Failed to start registration");
      }

      // 2. Start registration with browser
      const regOptions = await optionsRes.json();
      console.log("Registration options:", regOptions);
      const regResult = await startRegistration({
        optionsJSON: regOptions,
      });
      console.log("Registration result:", regResult);

      // 3. Verify registration with server
      const verifyRes = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          response: regResult,
        }),
      });

      const verification = await verifyRes.json();

      if (verification.verified) {
        setSuccess("Registration successful! You can now sign in.");
        setMode("signin");
      } else {
        throw new Error("Registration failed");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // 1. Get authentication options from server
      const optionsRes = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!optionsRes.ok) {
        const error = await optionsRes.json();
        throw new Error(error.error || "Failed to start authentication");
      }

      // 2. Start authentication with browser
      const authOptions = await optionsRes.json();
      console.log("Authentication options:", authOptions);
      const authResult = await startAuthentication({
        optionsJSON: authOptions,
      });
      console.log("Authentication result:", authResult);

      // 3. Verify authentication with server
      const verifyRes = await fetch("/api/auth/signin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          response: authResult,
        }),
      });

      if (!verifyRes.ok) {
        const error = await verifyRes.json();
        throw new Error(error.error || "Failed to verify authentication");
      }

      const verification = await verifyRes.json();
      console.log("Verification result:", verification);

      if (verification.verified) {
        setSuccess("Authentication successful!");
        // Wait a moment to show the success message
        await new Promise((resolve) => setTimeout(resolve, 1000));
        // Redirect to home page after successful login
        window.location.href = "/passkeys";
      } else {
        throw new Error("Authentication failed");
      }
    } catch (err) {
      console.error("Authentication error:", err);
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsLoading(false);
    }
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
            <form
              onSubmit={mode === "signup" ? handleSignup : handleSignin}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              {mode === "signup" && (
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
              )}

              <Button type="submit" isLoading={isLoading} className="w-full">
                {mode === "signup" ? "Sign Up" : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
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
