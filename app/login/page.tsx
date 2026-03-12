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
      <div className="mx-auto w-full max-w-md rounded-retro border border-retro-gray bg-retro-dark p-8 shadow-retro-outset">
        <h1 className="mb-2 text-center font-pixel text-3xl text-retro-green">
          ADMIN LOGIN
        </h1>
        <p className="mb-6 text-center text-retro-gray">
          Enter your credentials to access the admin panel.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-pixel text-sm text-retro-yellow"
            >
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-retro border border-retro-gray bg-retro-dark px-3 py-2 font-pixel text-retro-light"
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-pixel text-sm text-retro-yellow"
            >
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-retro border border-retro-gray bg-retro-dark px-3 py-2 font-pixel text-retro-light"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-retro border border-retro-red bg-retro-dark px-3 py-2 text-sm text-retro-red">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-retro border border-retro-green bg-retro-green px-4 py-3 font-pixel text-retro-dark transition-colors hover:bg-retro-dark hover:text-retro-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-retro-gray">
          <p>
            Use the seeded admin credentials from your environment variables.
          </p>
        </div>
      </div>
    </div>
  );
}
