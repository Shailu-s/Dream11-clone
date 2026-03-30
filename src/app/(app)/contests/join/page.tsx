"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinContestPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/contests/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push(`/contests/${data.contest.id}`);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Join Contest</h1>

      <form onSubmit={handleJoin} className="max-w-sm">
        <label className="block text-sm text-muted mb-1.5">
          Enter Invite Code
        </label>
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono tracking-widest text-center text-lg mb-4 focus:outline-none focus:border-primary"
          maxLength={6}
          required
        />
        {error && <p className="text-danger text-sm mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || inviteCode.length < 6}
          className="w-full bg-primary text-background font-semibold rounded-lg py-2.5 hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Joining..." : "Join Contest"}
        </button>
      </form>
    </div>
  );
}
