// app/teacher-signup/[token]/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TeacherInvitation } from "@/types/database";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function TeacherSignupPage({ params }: PageProps) {
  const router = useRouter();
  
  const [token, setToken] = useState<string>("");
  const [invitation, setInvitation] = useState<TeacherInvitation | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Extract token from params Promise
  useEffect(() => {
    const getToken = async () => {
      const resolvedParams = await params;
      setToken(resolvedParams.token);
    };
    getToken();
  }, [params]);

  const validateToken = useCallback(async () => {
    try {
      const response = await fetch(`/api/teacher-signup/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid invitation link");
        setLoading(false);
        return;
      }

      setInvitation(data.invitation);
    } catch {
      setError("Failed to validate invitation");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Validate invitation token when token is available
  useEffect(() => {
    if (token) {
      validateToken();
    }
  }, [token, validateToken]);

  const validateForm = () => {
    const errors = { password: "", confirmPassword: "" };
    let isValid = true;

    // Password validation
    if (!password) {
      errors.password = "Password is required";
      isValid = false;
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.password =
        "Password must contain uppercase, lowercase, and number";
      isValid = false;
    }

    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
      isValid = false;
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/teacher-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      // Success - redirect to login with toast notification
      toast.success("Account created successfully! Please log in.");
      router.push("/login");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Invalid Invitation
            </h2>
            <p className="mt-2 text-red-600">{error}</p>
            <div className="mt-6">
              <Button onClick={() => router.push("/login")}>Go to Login</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Complete Your Registration
          </h2>
          <p className="mt-2 text-gray-600">
            Welcome,{" "}
            <span className="font-semibold">{invitation?.first_name}</span>!
          </p>
          <p className="text-sm text-gray-500">
            Create your password to finish setting up your teacher account.
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow rounded-lg sm:px-10">
          {/* Invitation Details */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg text-gray-800">
            <div className="text-sm">
              <p>
                <strong>Email:</strong> {invitation?.email}
              </p>
              <p>
                <strong>Name:</strong> {invitation?.first_name}{" "}
                {invitation?.last_name}
              </p>
              {invitation?.institution && (
                <p>
                  <strong>Institution:</strong> {invitation.institution}
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <Input
                label="Create Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={validationErrors.password}
                placeholder="Enter your password"
                required
                className="text-black pr-10"
              />
              {password.length > 0 && (
                <button
                  type="button"
                  className="absolute right-3 top-9 text-gray-500"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              )}
            </div>

            <div className="relative">
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={validationErrors.confirmPassword}
                placeholder="Confirm your password"
                required
                className="text-black pr-10"
              />
              {confirmPassword.length > 0 && (
                <button
                  type="button"
                  className="absolute right-3 top-9 text-gray-500"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500">
              <p>Password requirements:</p>
              <ul className="list-disc list-inside mt-1">
                <li>At least 8 characters long</li>
                <li>Contains uppercase and lowercase letters</li>
                <li>Contains at least one number</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={submitting}
              disabled={!password || !confirmPassword}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/login")}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Sign in here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}