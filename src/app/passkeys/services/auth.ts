import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { User } from "../types/user";

interface AuthResponse {
  verified: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
  };
  error?: string;
}

export class AuthService {
  private static async handleAuthRequest<T>(
    url: string,
    data: T
  ): Promise<Response> {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Authentication request failed");
    }

    return response;
  }

  static async register(
    username: string,
    email: string
  ): Promise<AuthResponse> {
    try {
      // 1. Get registration options
      const optionsRes = await this.handleAuthRequest("/api/auth/signup", {
        username,
        email,
      });
      const options = await optionsRes.json();

      // 2. Create credentials with browser WebAuthn API
      const credential = await startRegistration({
        optionsJSON: options,
      });

      // 3. Verify registration with server
      const verifyRes = await this.handleAuthRequest(
        "/api/auth/signup/verify",
        {
          username,
          response: credential,
        }
      );

      return await verifyRes.json();
    } catch (error) {
      console.error("Registration error:", error);
      return {
        verified: false,
        error: error instanceof Error ? error.message : "Registration failed",
      };
    }
  }

  static async login(username: string): Promise<AuthResponse> {
    try {
      // 1. Get authentication options
      const optionsRes = await this.handleAuthRequest("/api/auth/signin", {
        username,
      });
      const options = await optionsRes.json();

      // 2. Get assertion with browser WebAuthn API
      const assertion = await startAuthentication({
        optionsJSON: options,
      });

      // 3. Verify authentication with server
      const verifyRes = await this.handleAuthRequest(
        "/api/auth/signin/verify",
        {
          username,
          response: assertion,
        }
      );

      return await verifyRes.json();
    } catch (error) {
      console.error("Authentication error:", error);
      return {
        verified: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    }
  }

  static async logout(): Promise<boolean> {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Logout failed");
      }

      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }

  static async deleteAccount(): Promise<boolean> {
    try {
      const response = await fetch("/api/auth/delete", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }

      return true;
    } catch (error) {
      console.error("Delete error:", error);
      return false;
    }
  }
}
