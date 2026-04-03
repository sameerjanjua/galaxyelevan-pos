"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import bgImage from "@/assets/images/login-bg.png";
import Image from "next/image";

export default function AdminLoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/super-admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Access Denied");
        return;
      }

      // Redirection logic for admin subdomain
      const currentHost = window.location.host;
      const protocol = window.location.protocol;
      const isLvhMe = currentHost.includes("lvh.me");
      const isLocalhost = currentHost.includes("localhost");

      // Check if we are on the admin subdomain already
      const hostParts = currentHost.split(":")[0].split(".");
      let isAlreadyOnAdmin = false;

      if (isLvhMe) {
        isAlreadyOnAdmin = hostParts.length > 2 && hostParts[0] === "admin";
      } else if (isLocalhost) {
        isAlreadyOnAdmin = hostParts.length > 1 && hostParts[0] === "admin";
      } else {
        // Production
        isAlreadyOnAdmin = hostParts.length > 2 && hostParts[0] === "admin";
      }

      if (!isAlreadyOnAdmin) {
        let baseDomain;
        const hostname = window.location.hostname; // Use hostname to exclude port
        const parts = hostname.split(".");

        if (isLvhMe) {
          // For lvh.me, base domain is the last 2 parts (e.g., lvh.me)
          baseDomain = parts.slice(-2).join(".");
        } else if (isLocalhost) {
          // For localhost, it's just localhost
          baseDomain = "localhost";
        } else {
          // For production, strip 'www' if it exists, and take the last 2 parts
          if (parts[0] === "www") {
            baseDomain = parts.slice(1).join(".");
          } else {
            // This handles both root domain and other subdomains correctly
            baseDomain = parts.slice(-2).join(".");
          }
        }

        const port = window.location.port ? `:${window.location.port}` : "";
        window.location.href = `${protocol}//admin.${baseDomain}${port}${redirect}`;
      } else {
        router.push(redirect);
      }
    } catch (err) {
      setError("A connection error occurred. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 font-sans">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
      <div className="absolute inset-0 z-10 bg-grid-white/[0.02] bg-size-[40px_40px]" />
      <div
        className="absolute inset-0 z-0"
      >
        <Image
          src={bgImage}
          alt="Login Background"
          fill
          className="absolute inset-0 z-0 object-cover brightness-[0.3] filter"
          priority
        />
      </div>

      {/* Animated Glow */}
      <div className="absolute top-1/2 left-1/2 h-125 w-125 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[120px]" />

      <div className="relative z-20 w-full max-w-md px-4">
        <div className="overflow-hidden rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-8 shadow-[0_8px_32px_0_rgba(0,0,0,1)] backdrop-blur-2xl">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-white/10 shadow-xl">
              <svg
                className="h-8 w-8 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
              System Admin
            </h1>
            <div className="mt-1 h-0.5 w-12 mx-auto bg-indigo-500/50 rounded-full" />
            <p className="mt-3 text-sm font-medium text-slate-500">
              Platform Governance Console
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-semibold text-red-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[2px] text-slate-500">
                Authorized Identity
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/5 bg-slate-950/50 py-3 px-4 text-sm text-white placeholder-slate-700 outline-none transition-all focus:border-indigo-500/50 focus:bg-slate-950 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="identity@system.root"
                disabled={loading}
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[2px] text-slate-500">
                Access Token
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/5 bg-slate-950/50 py-3 px-4 text-sm text-white placeholder-slate-700 outline-none transition-all focus:border-indigo-500/50 focus:bg-slate-950 focus:ring-4 focus:ring-indigo-500/10"
                placeholder="••••••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-white py-4 text-sm font-black tracking-widest text-slate-950 transition-all hover:bg-slate-200 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <svg className="h-5 w-5 animate-spin text-slate-950" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                "INITIALIZE AUTH"
              )}
            </button>
          </form>

          <Link
            href="/auth/login"
            className="mt-8 block text-center text-[10px] font-bold uppercase tracking-[1px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            ← Return to Standard Node
          </Link>
        </div>
      </div>
    </div>
  );
}
