"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { loginUser } from "@/store/auth/authThunks";
import Link from "next/link";
import Image from "next/image";
import bgImage from "@/assets/images/login-bg.png";

export default function LoginClient() {
  const dispatch = useDispatch();
  const router = useRouter();
  const loading = useSelector((state) => state.auth.loading);
  const error = useSelector((state) => state.auth.error);
  const [formError, setFormError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof email !== "string" || typeof password !== "string") {
      setFormError("Please enter a valid email and password.");
      return;
    }

    const resultAction = await dispatch(loginUser({ email, password }));

    if (loginUser.fulfilled.match(resultAction)) {
      const user = resultAction.payload.user;
      const tenantSlug = user.tenantSlug;

      // Determine redirection for subdomains
      const currentHost = window.location.host;
      const parts = currentHost.split(".");
      const isLocalhost = currentHost.includes("localhost") || currentHost.includes("lvh.me");

      // Check if we are already on the correct subdomain
      const currentSubdomain = parts.length > (isLocalhost ? 1 : 2) ? parts[0] : "";

      if (currentSubdomain !== tenantSlug) {
        const protocol = window.location.protocol;
        // Construct proper subdomain URL
        let baseDomain = currentHost;
        if (currentSubdomain) {
          baseDomain = currentHost.substring(currentSubdomain.length + 1);
        }

        // Use lvh.me for local subdomain testing if on localhost
        if (currentHost.includes("localhost:3000")) {
          baseDomain = "lvh.me:3000";
        }

        window.location.href = `${protocol}//${tenantSlug}.${baseDomain}/dashboard`;
      } else {
        router.push("/dashboard");
      }
    } else {
      const message = resultAction.payload || resultAction.error?.message;
      setFormError(message || "Failed to login.");
    }
  }

  const isSuspended = error?.includes("suspended");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 font-sans">
      {/* Background Image with Overlay */}
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
      <div className="absolute inset-0 z-10 bg-linear-to-br from-slate-950/80 via-transparent to-slate-950/80" />

      {/* Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-sky-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] rounded-full bg-purple-500/10 blur-[120px]" />

      {/* Login Card */}
      <div className="relative z-20 w-full max-w-md px-4">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-sky-400 to-sky-600 shadow-lg shadow-sky-500/20">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              POS Shop
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Premium Retail Management Suite
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="group">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 group-focus-within:text-sky-400 transition-colors">
                Business Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-sky-500/50 focus:bg-white/10 focus:ring-4 focus:ring-sky-500/10"
                  placeholder="name@business.com"
                  disabled={isSuspended}
                />
              </div>
            </div>

            <div className="group">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 group-focus-within:text-sky-400 transition-colors">
                Secure Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-sky-500/50 focus:bg-white/10 focus:ring-4 focus:ring-sky-500/10"
                  placeholder="••••••••••••"
                  disabled={isSuspended}
                />
              </div>
            </div>

            {(formError || error) && (
              <div className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${isSuspended
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-red-500/20 bg-red-500/5 text-red-300"
                }`}>
                <svg className="h-5 w-5 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold">Authentication Error</p>
                  <p className="mt-0.5 opacity-80">{formError || error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isSuspended}
              className="relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-sky-500 py-3.5 text-sm font-bold text-white transition-all hover:bg-sky-400 hover:shadow-[0_0_20px_0_rgba(14,165,233,0.4)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </div>
              ) : (
                "Sign In to Dashboard"
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <Link
              href="/auth/admin-login"
              className="text-xs font-medium text-slate-500 hover:text-sky-400 transition-colors uppercase tracking-widest"
            >
              Platform Administrator Access
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
