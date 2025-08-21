"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login, getRedirectPath } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get success message from URL params
  const successMessage = searchParams.get("message");

  useEffect(() => {
    // Clear success message after 5 seconds
    if (successMessage) {
      const timer = setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.delete("message");
        window.history.replaceState({}, "", url.toString());
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { user, error: loginError } = await login({ email, password });

      if (loginError) {
        setError(loginError);
        return;
      }

      if (user) {
        const redirectPath = getRedirectPath(user);
        router.push(redirectPath);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Online Exam Platform
          </p>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              autoComplete="email"
              className="text-black"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              autoComplete="current-password"
              className="text-black"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={loading}
            disabled={!email || !password}
          >
            Sign in
          </Button>
        </form>

        <div className="text-center text-sm text-gray-500">
          <p>
            Don&#39;t have an account? Contact your administrator for an
            invitation.
          </p>
        </div>
      </div>
    </div>
  );
}
