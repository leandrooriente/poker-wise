"use client";

import { useState } from "react";

export default function LoginPage() {
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

      const redirectTarget =
        new URLSearchParams(window.location.search).get("from") || "/";
      window.location.assign(redirectTarget);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-4">
      <div className="nes-container with-title is-dark mx-auto w-full max-w-md">
        <p className="title">ADMIN LOGIN</p>
        <p className="mb-6 text-center" style={{ color: "#999" }}>
          Enter your credentials to access admin panel.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="font-pixel mb-2 block text-sm"
              style={{ color: "#ffdd57" }}
            >
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="nes-input w-full"
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="font-pixel mb-2 block text-sm"
              style={{ color: "#ffdd57" }}
            >
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="nes-input w-full"
              placeholder="•••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              className="nes-container is-bordered px-3 py-2 text-sm"
              style={{
                background: "#fee",
                borderColor: "#e74c3c",
                color: "#e74c3c",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="nes-btn is-primary w-full"
            style={{ padding: "12px 24px" }}
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm" style={{ color: "#999" }}>
          <p>Use seeded admin credentials from your environment variables.</p>
        </div>
      </div>
    </div>
  );
}
