"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Contest {
  id: string;
  name: string;
  entryFee: number;
  prizePool: number;
  calculatedPrizePool: number;
  platformCutPct: number;
  prizeDistribution: Array<{ rank: number; percentage: number }>;
  inviteCode: string;
  status: string;
  match: { team1: string; team2: string; date: string; venue: string; status: string };
  creator: { username: string };
  entries: Array<{
    id: string;
    teamName: string;
    totalPoints: number;
    rank: number | null;
    prizeWon: number;
    userId: string;
    user: { username: string };
  }>;
  _count: { entries: number };
}

export default function ContestDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [contest, setContest] = useState<Contest | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    fetch(`/api/contests/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setContest(data.contest);
        setIsParticipant(data.isParticipant);
        setIsCreator(data.isCreator);
        setUserId(data.userId);
        setLoading(false);
      });
  }, [id]);

  function copyInviteCode() {
    if (!contest) return;
    navigator.clipboard.writeText(contest.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

  function shareContest() {
    if (!contest) return;
    const text = `Join my Stars11 contest "${contest.name}" for ${contest.match.team1} vs ${contest.match.team2}!\nEntry: ${contest.entryFee} tokens\nCode: ${contest.inviteCode}\n${window.location.href}`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) return <div className="text-muted">Loading...</div>;
  if (!contest) return <div className="text-danger">Contest not found</div>;

  const canJoin = contest.status === "OPEN" && !isParticipant;
  const canAddTeam = contest.status === "OPEN" && isParticipant;

  return (
    <div>
      <div className="bg-card rounded-xl p-5 border border-border mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold">{contest.name}</h1>
            <p className="text-muted text-sm">by @{contest.creator.username}</p>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              contest.status === "OPEN"
                ? "bg-success/20 text-success"
                : contest.status === "LOCKED"
                ? "bg-primary/20 text-primary"
                : contest.status === "COMPLETED"
                ? "bg-muted/20 text-muted"
                : "bg-danger/20 text-danger"
            }`}
          >
            {contest.status}
          </span>
        </div>

        <div className="text-lg font-semibold mb-1">
          {contest.match.team1} <span className="text-muted">vs</span>{" "}
          {contest.match.team2}
        </div>
        <div className="text-sm text-muted mb-3">
          {formatDate(new Date(contest.match.date))} &middot; {contest.match.venue}
        </div>

        {contest.match.status === "LIVE" && (
          <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 mb-4 text-sm text-danger font-semibold">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse flex-shrink-0" />
            Match is ongoing — scores updating
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          <div className="bg-background rounded-lg p-3">
            <div className="text-xs text-muted">Entry Fee</div>
            <div className="font-bold text-primary">{contest.entryFee} vINR</div>
          </div>
          <div className="bg-background rounded-lg p-3">
            <div className="text-xs text-muted">Prize Pool</div>
            <div className="font-bold text-success">
              {contest.calculatedPrizePool.toFixed(0)} vINR
            </div>
          </div>
          <div className="bg-background rounded-lg p-3">
            <div className="text-xs text-muted">Players</div>
            <div className="font-bold">{contest._count.entries}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-center font-mono tracking-widest text-lg">
            {contest.inviteCode}
          </div>
          <button
            onClick={copyInviteCode}
            className="bg-card border border-border rounded-lg px-3 py-2 text-sm hover:bg-card-hover"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={shareContest}
            className="bg-secondary text-white rounded-lg px-3 py-2 text-sm hover:bg-secondary/80"
          >
            Share
          </button>
        </div>

        <div className="bg-background rounded-lg p-3 mb-4">
          <div className="text-xs text-muted mb-2">Prize Distribution</div>
          <div className="flex gap-3">
            {contest.prizeDistribution.map((pd) => (
              <div key={pd.rank} className="text-sm">
                <span className="text-muted">#{pd.rank}:</span>{" "}
                <span className="font-semibold">{pd.percentage}%</span>
                <span className="text-muted text-xs ml-1">
                  ({((contest.calculatedPrizePool * pd.percentage) / 100).toFixed(0)}T)
                </span>
              </div>
            ))}
          </div>
        </div>

        {isCreator && !isParticipant && contest.status === "OPEN" && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 mb-3 text-sm text-primary">
            You created this contest — pick your team to join!
          </div>
        )}

        {canJoin && (
          <button
            onClick={() => router.push(`/contests/${id}/team`)}
            className="w-full bg-primary text-background font-semibold rounded-lg py-2.5 hover:bg-primary-hover transition-colors"
          >
            {isCreator ? "Pick My Team & Join" : `Join Contest (${contest.entryFee} vINR)`}
          </button>
        )}

        {canAddTeam && (
          <button
            onClick={() => router.push(`/contests/${id}/team`)}
            className="w-full bg-secondary text-white font-semibold rounded-lg py-2.5 hover:bg-secondary/80 transition-colors"
          >
            Add Another Team
          </button>
        )}
      </div>

      <h2 className="text-lg font-semibold mb-3">
        {contest.status === "COMPLETED" ? "Final Leaderboard" : "Participants"}
      </h2>

      {/* Phatka messages — only for completed contests */}
      {contest.status === "COMPLETED" && userId && (() => {
        const myEntry = contest.entries.find((e) => e.userId === userId);
        const totalEntries = contest.entries.length;
        if (!myEntry || !myEntry.rank) return null;
        if (myEntry.rank === 1) {
          return (
            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 mb-4 text-center">
              <div className="text-xl font-bold text-primary">🏆 You fucked well today.</div>
              <div className="text-sm text-muted mt-1">Champion. Everyone else got wrecked.</div>
            </div>
          );
        }
        if (myEntry.rank === totalEntries && totalEntries > 1) {
          return (
            <div className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 mb-4 text-center">
              <div className="text-xl font-bold text-danger">💀 You got fucked pretty bad.</div>
              <div className="text-sm text-muted mt-1">It&apos;s gonna swell. Better luck next match.</div>
            </div>
          );
        }
        // mid table
        return (
          <div className="bg-card border border-border rounded-xl px-4 py-3 mb-4 text-center">
            <div className="text-base font-semibold text-foreground">😐 Just a regular fucking session.</div>
            <div className="text-sm text-muted mt-1">Not bad, not great. Show up harder next time.</div>
          </div>
        );
      })()}

      {/* Join a different contest by code */}
      {!isParticipant && contest.status === "OPEN" && (
        <div className="mb-4">
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted hover:text-foreground select-none list-none flex items-center gap-1">
              <span className="text-xs">▶</span>
              <span className="group-open:hidden">Have a different invite code?</span>
              <span className="hidden group-open:inline">Have a different invite code?</span>
            </summary>
            <form onSubmit={handleJoinByCode} className="mt-3 flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABCD12"
                maxLength={6}
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
            {joinError && <p className="text-danger text-xs mt-2">{joinError}</p>}
          </details>
        </div>
      )}

      {contest.entries.length === 0 ? (
        <div className="text-muted bg-card rounded-xl p-6 text-center">
          No entries yet. Share the invite code with friends!
        </div>
      ) : (
        <div className="space-y-2">
          {contest.entries.map((entry, i) => (
            <Link
              key={entry.id}
              href={`/contests/${id}/entry/${entry.id}`}
              className={`bg-card rounded-lg p-3 border border-border flex items-center justify-between hover:bg-card-hover transition-colors ${
                entry.userId === userId ? "border-primary/50" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    entry.rank === 1
                      ? "bg-primary/20 text-primary"
                      : entry.rank === 2
                      ? "bg-muted/30 text-foreground"
                      : entry.rank === 3
                      ? "bg-primary/10 text-primary/70"
                      : "bg-background text-muted"
                  }`}
                >
                  {entry.rank || i + 1}
                </span>
                <div>
                  <div className="text-sm font-medium">
                    {entry.teamName}
                    {entry.userId === userId && (
                      <span className="text-primary text-xs ml-1">(You)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted">@{entry.user.username}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-sm">
                  {entry.totalPoints.toFixed(1)} pts
                </div>
                {entry.prizeWon > 0 && (
                  <div className="text-xs text-success font-semibold">
                    +{entry.prizeWon.toFixed(0)} vINR
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
