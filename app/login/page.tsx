"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthContext } from "../../lib/components/AuthProvider";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Card, CardContent, CardFooter, CardHeader } from "../../components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signIn } = useAuthContext();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if user is already logged in
  useEffect(() => {
    if (user && !loading) {
      // Redirect based on user role
      if (user.profile?.role === "admin") {
        router.push("/admin");
      } else if (user.profile?.role === "teacher") {
        router.push("/teacher");
      } else {
        router.push("/student");
      }
    }
  }, [user, loading, router]);
  
  // Handle redirect after login
  useEffect(() => {
    const redirect = searchParams.get("redirect");
    if (redirect) {
      // We'll handle this after successful login
    }
    
    const message = searchParams.get("message");
    if (message === "invitation-processed") {
      setError("Invitation processed! Please log in with your new account.");
    }
  }, [searchParams]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      await signIn(email, password);
      
      // Redirect based on user role or redirect parameter
      const redirect = searchParams.get("redirect");
      if (redirect) {
        router.push(decodeURIComponent(redirect));
      } else {
        // Default redirects based on role
        if (user?.profile?.role === "admin") {
          router.push("/admin");
        } else if (user?.profile?.role === "teacher") {
          router.push("/teacher");
        } else {
          router.push("/student");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Failed to log in");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Don't show login form if user is already logged in
  if (user) {
    return null;
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Online Exam Platform
            </p>
          </CardHeader>
          
          <CardContent>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <Input
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <Input
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div>
                <Button
                  type="submit"
                  className="w-full"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-gray-600 text-center">
              <p>
                Don't have an account? Contact your administrator.
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}