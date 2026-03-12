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
    <div className="py-4">
      <div className="rounded-retro border-retro-gray bg-retro-dark shadow-retro-outset mx-auto w-full max-w-md border p-8">
        <h1 className="font-pixel text-retro-green mb-2 text-center text-3xl">
          ADMIN LOGIN
        </h1>
        <p className="text-retro-gray mb-6 text-center">
          Enter your credentials to access the admin panel.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="font-pixel text-retro-yellow mb-2 block text-sm"
            >
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-retro border-retro-gray bg-retro-dark font-pixel text-retro-light w-full border px-3 py-2"
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="font-pixel text-retro-yellow mb-2 block text-sm"
            >
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-retro border-retro-gray bg-retro-dark font-pixel text-retro-light w-full border px-3 py-2"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-retro border-retro-red bg-retro-dark text-retro-red border px-3 py-2 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-retro border-retro-green bg-retro-green font-pixel text-retro-dark hover:bg-retro-dark hover:text-retro-green w-full border px-4 py-3 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>
      </div>
    </div>
  );
}
