"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

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

function useCountdown(matchDate: Date | null) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!matchDate) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [matchDate]);

  if (!matchDate) return { countdown: "", minutesUntil: 0 };

  const msUntil = matchDate.getTime() - now.getTime();
  const totalSeconds = Math.floor(msUntil / 1000);
  const minutesUntil = Math.floor(msUntil / 60000);
  const hoursUntil = Math.floor(minutesUntil / 60);
  const daysUntil = Math.floor(hoursUntil / 24);

  let countdown = "";
  if (totalSeconds <= 0) {
    countdown = "Starting now";
  } else if (totalSeconds < 3600) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    countdown = `${m}m ${s}s`;
  } else if (hoursUntil < 24) {
    countdown = `${hoursUntil}h ${minutesUntil % 60}m`;
  } else {
    countdown = `${daysUntil}d ${hoursUntil % 24}h`;
  }

  return { countdown, minutesUntil };
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

  const isUpcoming = match.status === "UPCOMING";

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
            match.status === "LIVE"
              ? "bg-danger/20 text-danger"
              : match.status === "UPCOMING"
              ? "bg-success/20 text-success"
              : "bg-muted/20 text-muted"
          }`}>
            {match.status}
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
        {isUpcoming && minutesUntil <= 0 && (
          <div className="bg-danger/10 text-danger text-sm font-semibold rounded-lg px-3 py-2 text-center">
            🔒 Teams are now locked
          </div>
        )}
        {match.status === "LIVE" && (
          <div className="bg-danger/10 text-danger text-sm font-semibold rounded-lg px-3 py-2 text-center flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-danger animate-pulse inline-block" />
            Match is Live — teams are locked
          </div>
        )}
      </div>

      {/* Action buttons — only for upcoming matches */}
      {isUpcoming && (
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => router.push(`/matches/${matchId}/team`)}
            className="bg-primary text-background font-semibold rounded-xl py-3 hover:bg-primary-hover transition-colors text-left px-4"
          >
            <div className="font-bold">Create Team</div>
            <div className="text-xs opacity-70 mt-0.5">Build & save a team for this match</div>
          </button>
          <button
            onClick={() => router.push(`/contests/create?matchId=${matchId}`)}
            className="bg-card border border-border font-semibold rounded-xl py-3 hover:bg-card-hover transition-colors text-left px-4"
          >
            <div className="font-bold">Create Contest</div>
            <div className="text-xs text-muted mt-0.5">Start a new contest and invite friends</div>
          </button>
          <button
            onClick={() => setShowJoinInput(!showJoinInput)}
            className="bg-card border border-border font-semibold rounded-xl py-3 hover:bg-card-hover transition-colors text-left px-4"
          >
            <div className="font-bold">Join Contest by Code</div>
            <div className="text-xs text-muted mt-0.5">Have an invite code? Enter it here</div>
          </button>
          {showJoinInput && (
            <form onSubmit={handleJoinByCode} className="flex gap-2 px-1">
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
                className="bg-primary text-background text-sm font-semibold rounded-lg px-4 py-2 hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {joinLoading ? "..." : "Join"}
              </button>
            </form>
          )}
          {joinError && <p className="text-danger text-sm px-1">{joinError}</p>}
        </div>
      )}

      {/* Saved Teams */}
      {savedTeams.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Your Saved Teams</h2>
          <div className="space-y-2">
            {savedTeams.map((team) => (
              <div key={team.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-semibold">{team.teamName}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {team.players.length} players &middot; saved {new Date(team.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {isUpcoming && (
                      <button
                        onClick={() => router.push(`/matches/${matchId}/team?editTeamId=${team.id}`)}
                        className="text-xs text-primary hover:underline"
                      >
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTeam(team.id)}
                      className="text-xs text-muted hover:text-danger transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {contests.filter((c) => !c.isJoined).length > 0 && isUpcoming && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted mb-1">Join a contest with this team:</div>
                    {contests.filter((c) => !c.isJoined).map((contest) => (
                      <button
                        key={contest.id}
                        onClick={() => router.push(`/contests/${contest.id}/team?savedTeamId=${team.id}`)}
                        className="w-full text-left bg-background border border-border rounded-lg px-3 py-2 text-sm hover:border-primary/50 transition-colors"
                      >
                        <span className="font-medium">{contest.name}</span>
                        <span className="text-muted ml-2">{contest.entryFee} vINR entry</span>
                      </button>
                    ))}
                  </div>
                )}
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
                className={`bg-card border rounded-xl p-4 ${
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
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-primary">{contest.entryFee} vINR</span>
                  <button
                    onClick={() =>
                      contest.isJoined
                        ? router.push(`/contests/${contest.id}`)
                        : router.push(`/contests/${contest.id}/team`)
                    }
                    className={`text-sm font-semibold rounded-lg px-4 py-1.5 transition-colors ${
                      contest.isJoined
                        ? "bg-card-hover border border-border hover:bg-card text-foreground"
                        : "bg-primary text-background hover:bg-primary-hover"
                    }`}
                  >
                    {contest.isJoined ? "View" : "Join"}
                  </button>
                </div>
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
