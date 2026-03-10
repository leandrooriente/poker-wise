"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Redirect to groups page (or admin dashboard)
      router.push("/");
      router.refresh(); // Ensure session state is updated
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="border border-retro-gray rounded-retro p-8 bg-retro-dark shadow-retro-outset max-w-md w-full">
        <h1 className="text-3xl font-pixel text-retro-green mb-2 text-center">
          ADMIN LOGIN
        </h1>
        <p className="text-retro-gray text-center mb-6">
          Enter your credentials to access the admin panel.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-retro-yellow font-pixel text-sm mb-2">
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-retro-gray rounded-retro bg-retro-dark text-retro-light font-pixel"
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-retro-yellow font-pixel text-sm mb-2">
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-retro-gray rounded-retro bg-retro-dark text-retro-light font-pixel"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="px-3 py-2 border border-retro-red rounded-retro bg-retro-dark text-retro-red text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 border border-retro-green rounded-retro bg-retro-green text-retro-dark font-pixel hover:bg-retro-dark hover:text-retro-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>

        <div className="mt-8 text-center text-retro-gray text-sm">
          <p>
            Use the seeded admin credentials from your environment variables.
          </p>
        </div>
      </div>
    </div>
  );
}