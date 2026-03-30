"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

interface Contest {
  id: string;
  name: string;
  entryFee: number;
  inviteCode: string;
  status: string;
  isJoined: boolean;
  creator: { username: string };
  _count: { entries: number };
  prizeDistribution: Array<{ rank: number; percentage: number }>;
  match: { team1: string; team2: string; date: string; venue: string };
}

interface MyEntry {
  id: string;
  teamName: string;
  totalPoints: number;
  rank: number | null;
  prizeWon: number;
  contest: {
    id: string;
    name: string;
    status: string;
    match: { team1: string; team2: string; date: string };
  };
}

export default function ContestsPage() {
  const router = useRouter();
  const [openContests, setOpenContests] = useState<Contest[]>([]);
  const [myEntries, setMyEntries] = useState<MyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"available" | "mine">("available");
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);

  useEffect(() => {
    async function load() {
      const [contestsRes, entriesRes] = await Promise.all([
        fetch("/api/contests"),
        fetch("/api/contests/my-entries"),
      ]);
      const contestsData = await contestsRes.json();
      const entriesData = await entriesRes.json();
      setOpenContests(contestsData.contests || []);
      setMyEntries(entriesData.entries || []);
      setLoading(false);
    }
    load();
  }, []);

  async function handleJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    setJoinLoading(true);
    setJoinError("");
    const res = await fetch("/api/contests/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: joinCode }),
    });
    const data = await res.json();
    setJoinLoading(false);
    if (!res.ok) {
      setJoinError(data.error);
      return;
    }
    router.push(`/contests/${data.contest.id}`);
  }

  const activeEntries = myEntries.filter(
    (e) => e.contest.status === "OPEN" || e.contest.status === "LOCKED"
  );
  const pastEntries = myEntries.filter((e) => e.contest.status === "COMPLETED");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contests</h1>
        <button
          onClick={() => setShowJoinInput(!showJoinInput)}
          className="text-sm text-primary font-semibold hover:underline"
        >
          + Join by code
        </button>
      </div>

      {showJoinInput && (
        <form onSubmit={handleJoinByCode} className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Enter invite code"
            maxLength={6}
            autoFocus
            className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono tracking-widest text-center focus:outline-none focus:border-primary"
            required
          />
          <button
            type="submit"
            disabled={joinLoading || joinCode.length < 6}
            className="bg-primary text-background text-sm font-semibold rounded-lg px-4 py-2 hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {joinLoading ? "..." : "Join"}
          </button>
        </form>
      )}
      {joinError && <p className="text-danger text-sm">{joinError}</p>}

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-lg p-1 border border-border">
        <button
          onClick={() => setTab("available")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "available" ? "bg-primary text-background" : "text-muted hover:text-foreground"
          }`}
        >
          Available
          {openContests.filter((c) => !c.isJoined).length > 0 && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "available" ? "bg-background/20" : "bg-primary/20 text-primary"}`}>
              {openContests.filter((c) => !c.isJoined).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "mine" ? "bg-primary text-background" : "text-muted hover:text-foreground"
          }`}
        >
          My Contests
          {activeEntries.length > 0 && (
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${tab === "mine" ? "bg-background/20" : "bg-primary/20 text-primary"}`}>
              {activeEntries.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : tab === "available" ? (
        <div className="space-y-3">
          {openContests.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted">
              No open contests right now. Create one from a match!
            </div>
          ) : (
            openContests.map((contest) => (
              <div
                key={contest.id}
                onClick={() => router.push(`/contests/${contest.id}`)}
                className={`bg-card border rounded-xl p-4 cursor-pointer hover:bg-card-hover transition-colors ${contest.isJoined ? "border-primary/40" : "border-border"}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="font-semibold">{contest.name}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {contest.match.team1} vs {contest.match.team2} &middot; {formatDate(new Date(contest.match.date))}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      by @{contest.creator.username} &middot; {contest._count.entries} joined
                    </div>
                  </div>
                  {contest.isJoined ? (
                    <span className="text-xs font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full flex-shrink-0">
                      Joined
                    </span>
                  ) : (
                    <span className="text-xs font-semibold bg-success/15 text-success px-2 py-0.5 rounded-full flex-shrink-0">
                      Open
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-primary mt-2 block">{contest.entryFee} vINR entry</span>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {activeEntries.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Active</h2>
              <div className="space-y-2">
                {activeEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => router.push(`/contests/${entry.contest.id}`)}
                    className="w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-card-hover transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{entry.contest.name}</div>
                        <div className="text-xs text-muted mt-0.5">
                          {entry.contest.match.team1} vs {entry.contest.match.team2}
                        </div>
                        <div className="text-xs text-muted mt-0.5">{entry.teamName}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        entry.contest.status === "LOCKED" ? "bg-primary/20 text-primary" : "bg-success/20 text-success"
                      }`}>
                        {entry.contest.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {pastEntries.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Past</h2>
              <div className="space-y-2">
                {pastEntries.slice(0, 10).map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => router.push(`/contests/${entry.contest.id}`)}
                    className="w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-card-hover transition-colors opacity-80"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">{entry.contest.name}</div>
                        <div className="text-xs text-muted mt-0.5">
                          {entry.contest.match.team1} vs {entry.contest.match.team2} &middot; {entry.teamName}
                        </div>
                      </div>
                      <div className="text-right">
                        {entry.rank && <div className="text-sm font-bold">#{entry.rank}</div>}
                        {entry.prizeWon > 0 ? (
                          <div className="text-xs text-success font-bold">+{entry.prizeWon} vINR</div>
                        ) : (
                          <div className="text-xs text-muted">{entry.totalPoints.toFixed(1)} pts</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {myEntries.length === 0 && (
            <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted">
              You haven&apos;t joined any contests yet.
              <button onClick={() => setTab("available")} className="block mx-auto mt-2 text-primary font-semibold hover:underline">
                Browse Available Contests
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
