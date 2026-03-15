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
    <div className="nes-main-content">
      <div className="nes-container with-title is-dark">
        <p className="title">ADMIN LOGIN</p>
        <p className="nes-text-sm">
          Enter your credentials to access admin panel.
        </p>

        <form onSubmit={handleSubmit} className="nes-stack">
          <div className="nes-field">
            <label htmlFor="email" className="nes-text-sm">
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="nes-input"
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="nes-field">
            <label htmlFor="password" className="nes-text-sm">
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="nes-input"
              placeholder="••••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="nes-container is-rounded is-error">
              <p className="nes-text is-error">⚠️ {error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="nes-btn is-primary"
          >
            {loading ? "LOGGING IN..." : "LOGIN"}
          </button>
        </form>

        <div className="nes-mt-4 nes-text-center nes-text-sm">
          <p>Use seeded admin credentials from your environment variables.</p>
        </div>
      </div>
    </div>
  );
}
