"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { useCountdown } from "@/components/Countdown";

interface Match {
  id: string;
  team1: string;
  team2: string;
  date: string;
  venue: string;
  status: string;
}

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
}

interface SavedTeam {
  id: string;
  teamName: string;
  players: Array<{ playerId: string; isCaptain: boolean; isViceCaptain: boolean }>;
  matchId: string;
  createdAt: string;
}

export default function MatchDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const matchId = id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [savedTeams, setSavedTeams] = useState<SavedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [showJoinInput, setShowJoinInput] = useState(false);

  const matchDate = match ? new Date(match.date) : null;
  const { countdown, minutesUntil } = useCountdown(matchDate as Date | null);

  useEffect(() => {
    async function load() {
      const [matchRes, contestsRes, teamsRes] = await Promise.all([
        fetch(`/api/matches?matchId=${matchId}`),
        fetch(`/api/contests?matchId=${matchId}`),
        fetch(`/api/teams?matchId=${matchId}`),
      ]);
      const matchData = await matchRes.json();
      const contestsData = await contestsRes.json();
      const teamsData = await teamsRes.json();

      const found = (matchData.matches || []).find((m: Match) => m.id === matchId);
      setMatch(found || null);
      setContests(contestsData.contests || []);
      setSavedTeams(teamsData.teams || []);
      setLoading(false);
    }
    load();
  }, [matchId]);

  async function handleDeleteTeam(teamId: string) {
    await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
    setSavedTeams((prev) => prev.filter((t) => t.id !== teamId));
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

  if (loading) return <div className="text-muted">Loading...</div>;
  if (!match) return <div className="text-danger">Match not found</div>;

  const matchStarted = new Date(match.date) <= new Date();
  const isUpcoming = match.status === "UPCOMING" && !matchStarted;

  return (
    <div className="space-y-6">
      {/* Match header */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-2xl font-bold">
              {match.team1} <span className="text-muted text-lg font-normal">vs</span> {match.team2}
            </div>
            <div className="text-sm text-muted mt-1">
              {formatDate(new Date(match.date))} &middot; {match.venue}
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            match.status === "LIVE" || matchStarted
              ? "bg-danger/20 text-danger"
              : match.status === "UPCOMING"
              ? "bg-success/20 text-success"
              : "bg-muted/20 text-muted"
          }`}>
            {match.status === "UPCOMING" && matchStarted ? "LIVE" : match.status}
          </span>
        </div>
        {isUpcoming && minutesUntil > 0 && (
          <div className={`text-sm font-semibold rounded-lg px-3 py-2 text-center tabular-nums ${
            minutesUntil <= 60
              ? "bg-danger/10 text-danger"
              : "bg-primary/10 text-primary"
          }`}>
            ⏱ {countdown} to lock
            {minutesUntil <= 60 && <span className="ml-1 text-xs font-normal opacity-80">— teams lock soon!</span>}
          </div>
        )}
        {matchStarted && match.status !== "COMPLETED" && (
          <div className="bg-danger/10 text-danger text-sm font-semibold rounded-lg px-3 py-2 text-center flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse inline-block" />
            Match is Live — teams are locked
          </div>
        )}
      </div>

      {/* Action buttons — only for upcoming matches */}
      {isUpcoming && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push(`/matches/${matchId}/team`)}
              className="bg-primary text-white font-semibold rounded-lg py-2.5 px-3 text-sm hover:bg-primary-hover transition-colors"
            >
              + Create Team
            </button>
            <button
              onClick={() => router.push(`/contests/create?matchId=${matchId}`)}
              className="bg-card border border-border font-semibold rounded-lg py-2.5 px-3 text-sm hover:bg-card-hover transition-colors"
            >
              + Create Contest
            </button>
          </div>
          <button
            onClick={() => setShowJoinInput(!showJoinInput)}
            className="w-full bg-card border border-border font-semibold rounded-lg py-2.5 px-3 text-sm hover:bg-card-hover transition-colors text-muted"
          >
            Join by Code
          </button>
          {showJoinInput && (
            <form onSubmit={handleJoinByCode} className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABCD12"
                maxLength={6}
                autoFocus
                className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono tracking-widest text-center focus:outline-none focus:border-primary"
                required
              />
              <button
                type="submit"
                disabled={joinLoading || joinCode.length < 6}
                className="bg-primary text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {joinLoading ? "..." : "Join"}
              </button>
            </form>
          )}
          {joinError && <p className="text-danger text-sm">{joinError}</p>}
        </div>
      )}

      {/* Saved Teams */}
      {savedTeams.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Your Saved Teams</h2>
          <div className="space-y-2">
            {savedTeams.map((team) => (
              <div
                key={team.id}
                onClick={() => router.push(`/teams/${team.id}`)}
                className="bg-card border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-card-hover transition-colors"
              >
                <div>
                  <div className="font-semibold">{team.teamName}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {team.players.length} players &middot; saved {new Date(team.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-xs text-primary font-semibold">View &rarr;</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Contests for this match */}
      {contests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Open Contests</h2>
          <div className="space-y-3">
            {contests.map((contest) => (
              <div
                key={contest.id}
                onClick={() => router.push(`/contests/${contest.id}`)}
                className={`bg-card border rounded-xl p-4 cursor-pointer hover:bg-card-hover transition-colors ${
                  contest.isJoined ? "border-primary/40" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">{contest.name}</div>
                    <div className="text-xs text-muted mt-0.5">
                      by @{contest.creator.username} &middot; {contest._count.entries} joined
                    </div>
                  </div>
                  {contest.isJoined ? (
                    <span className="text-xs font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                      Joined
                    </span>
                  ) : (
                    <span className="text-xs font-semibold bg-success/15 text-success px-2 py-0.5 rounded-full">
                      Open
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-primary">{contest.entryFee} vINR entry</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isUpcoming && contests.length === 0 && savedTeams.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-xl p-6 text-center text-sm text-muted">
          No contests yet for this match. Create one and invite your friends!
        </div>
      )}
    </div>
  );
}
