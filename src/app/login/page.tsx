"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step =
  | "email"       // Enter email → check if registered
  | "login"       // Existing user: enter password
  | "otp-signup"  // New user: receive OTP
  | "signup"      // New user: pick username + password after OTP
  | "forgot-otp"  // Forgot password: enter OTP
  | "reset";      // Forgot password: set new password

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [username, setUsername] = useState("");
  const [usernameSuggestion, setUsernameSuggestion] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    // Check if email is already registered
    const res = await fetch("/api/auth/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    if (data.exists) {
      // Existing user → go straight to password
      setStep("login");
    } else {
      // New user → send OTP for signup
      await sendOtpForSignup();
    }
  }

  async function sendOtpForSignup() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setStep("otp-signup");
    setInfo("OTP sent to your email");
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setStep("signup");
    setInfo("");
    // Fetch a unique username suggestion
    fetch("/api/auth/suggest-username")
      .then((r) => r.json())
      .then((d) => setUsernameSuggestion(d.username))
      .catch(() => {});
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, username, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push("/dashboard");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push("/dashboard");
  }

  async function handleForgotPassword() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      return;
    }

    setOtp("");
    setStep("forgot-otp");
    setInfo("OTP sent to your email for password reset");
  }

  async function handleForgotOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setStep("reset");
    setInfo("");
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, password: newPassword }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setStep("login");
    setPassword("");
    setOtp("");
    setNewPassword("");
    setInfo("Password reset! Login with your new password");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl font-black tracking-tighter text-primary mb-1">WGF</div>
          <p className="text-xs text-muted uppercase tracking-widest">Who Gets Fucked?</p>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-lg">
          {info && (
            <div className="bg-success/10 border border-success/30 text-success text-sm rounded-lg px-3 py-2 mb-4">
              {info}
            </div>
          )}

          {/* Step: Enter email */}
          {step === "email" && (
            <form onSubmit={handleEmailSubmit}>
              <label className="block text-sm text-muted mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-primary"
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-primary text-background font-semibold rounded-lg py-2.5 hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {loading ? "Checking..." : "Continue"}
              </button>
            </form>
          )}

          {/* Existing user: enter password */}
          {step === "login" && (
            <form onSubmit={handleLogin}>
              <p className="text-sm text-muted mb-1">Welcome back!</p>
              <p className="text-xs text-muted mb-4">{email}</p>
              <label className="block text-sm text-muted mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-primary"
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-primary text-background font-semibold rounded-lg py-2.5 hover:bg-primary-hover disabled:opacity-50 transition-colors mb-3"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
              <div className="flex justify-between text-xs text-muted">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setPassword(""); setError(""); setInfo(""); }}
                  className="hover:text-foreground"
                >
                  Change email
                </button>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="hover:text-foreground"
                >
                  Forgot password?
                </button>
              </div>
            </form>
          )}

          {/* New user: enter OTP */}
          {step === "otp-signup" && (
            <form onSubmit={handleOtpVerify}>
              <p className="text-sm text-muted mb-1">New account</p>
              <p className="text-xs text-muted mb-3">Enter the OTP sent to {email}</p>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-primary tracking-widest text-center text-lg"
                maxLength={6}
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full bg-primary text-background font-semibold rounded-lg py-2.5 hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("email"); setOtp(""); setError(""); setInfo(""); }}
                className="w-full text-xs text-muted mt-3 hover:text-foreground"
              >
                Change email
              </button>
            </form>
          )}

          {/* New user: pick username + password */}
          {step === "signup" && (
            <form onSubmit={handleSignup}>
              <p className="text-sm text-muted mb-4">Almost there! Set up your account.</p>
              <label className="block text-sm text-muted mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder={usernameSuggestion || "e.g. cricket_king"}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-1 focus:outline-none focus:border-primary"
                minLength={3}
                maxLength={20}
                required
                autoFocus
              />
              {usernameSuggestion && !username && (
                <p className="text-xs text-muted mb-3">
                  Suggestion:{" "}
                  <button
                    type="button"
                    onClick={() => setUsername(usernameSuggestion)}
                    className="text-primary hover:underline"
                  >
                    {usernameSuggestion}
                  </button>
                </p>
              )}
              {(!usernameSuggestion || username) && <div className="mb-3" />}
              <label className="block text-sm text-muted mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-primary"
                minLength={6}
                required
              />
              <button
                type="submit"
                disabled={loading || username.length < 3 || password.length < 6}
                className="w-full bg-primary text-background font-semibold rounded-lg py-2.5 hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}

          {/* Forgot password: enter OTP */}
          {step === "forgot-otp" && (
            <form onSubmit={handleForgotOtp}>
              <p className="text-sm text-muted mb-1">Password reset</p>
              <p className="text-xs text-muted mb-3">Enter the OTP sent to {email}</p>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-primary tracking-widest text-center text-lg"
                maxLength={6}
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full bg-primary text-background font-semibold rounded-lg py-2.5 hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}

          {/* Forgot password: set new password */}
          {step === "reset" && (
            <form onSubmit={handleReset}>
              <p className="text-sm text-muted mb-4">Set a new password for {email}</p>
              <label className="block text-sm text-muted mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-primary"
                minLength={6}
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || newPassword.length < 6}
                className="w-full bg-primary text-background font-semibold rounded-lg py-2.5 hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          {error && (
            <p className="text-danger text-sm mt-3 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
