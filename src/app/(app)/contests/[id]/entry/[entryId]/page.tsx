"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface PlayerInfo {
  id: string;
  name: string;
  team: string;
  role: string;
  creditPrice: number;
}

interface TeamPlayer {
  playerId: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  player: PlayerInfo | null;
}

interface EntryDetail {
  id: string;
  teamName: string;
  totalPoints: number;
  rank: number | null;
  prizeWon: number;
  team: TeamPlayer[];
  user: { username: string };
  contest: {
    id: string;
    status: string;
    match: { id: string; team1: string; team2: string; date: string; status: string };
  };
}

const ROLE_ORDER = ["WK", "BAT", "AR", "BOWL"];

export default function EntryDetailPage() {
  const { id: contestId, entryId } = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/contests/${contestId}/entry/${entryId}`)
      .then((r) => r.json())
      .then((data) => {
        setEntry(data.entry);
        setIsOwner(data.isOwner);
        setLoading(false);
      });
  }, [contestId, entryId]);

  if (loading) return <div className="text-muted">Loading...</div>;
  if (!entry) return <div className="text-danger">Team not found</div>;

  const matchUpcoming = entry.contest.match.status === "UPCOMING";
  const contestOpen = entry.contest.status === "OPEN";
  const canEdit = isOwner && matchUpcoming && contestOpen;

  const captain = entry.team.find((p) => p.isCaptain);
  const vc = entry.team.find((p) => p.isViceCaptain);

  // Group by role
  const byRole = ROLE_ORDER.map((role) => ({
    role,
    players: entry.team.filter((p) => p.player?.role === role),
  })).filter((g) => g.players.length > 0);

  const roleLabel: Record<string, string> = {
    WK: "Wicket Keeper",
    BAT: "Batters",
    AR: "All Rounders",
    BOWL: "Bowlers",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{entry.teamName}</h1>
            <div className="text-sm text-muted mt-0.5">
              @{entry.user.username} &middot; {entry.contest.match.team1} vs {entry.contest.match.team2}
            </div>
          </div>
          {entry.rank && (
            <div className={`text-center px-3 py-1.5 rounded-xl ${
              entry.rank === 1 ? "bg-primary/20 text-primary" : "bg-card-hover text-muted"
            }`}>
              <div className="text-lg font-bold">#{entry.rank}</div>
              <div className="text-[10px] uppercase tracking-wide">Rank</div>
            </div>
          )}
        </div>

        {entry.totalPoints > 0 && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-border">
            <div>
              <div className="text-xs text-muted">Points</div>
              <div className="font-bold text-primary">{entry.totalPoints.toFixed(1)}</div>
            </div>
            {entry.prizeWon > 0 && (
              <div>
                <div className="text-xs text-muted">Prize Won</div>
                <div className="font-bold text-success">+{entry.prizeWon.toFixed(0)} vINR</div>
              </div>
            )}
          </div>
        )}

        {canEdit && (
          <button
            onClick={() => router.push(`/contests/${contestId}/team?editEntryId=${entryId}`)}
            className="mt-3 w-full bg-primary text-background font-semibold rounded-lg py-2 text-sm hover:bg-primary-hover transition-colors"
          >
            Edit Team
          </button>
        )}
      </div>

      {/* C/VC callout */}
      <div className="grid grid-cols-2 gap-3">
        {captain?.player && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-center">
            <div className="text-xs text-primary font-semibold mb-1">CAPTAIN (2x)</div>
            <div className="font-bold text-sm">{captain.player.name}</div>
            <div className="text-xs text-muted">{captain.player.team} · {captain.player.role}</div>
          </div>
        )}
        {vc?.player && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-3 text-center">
            <div className="text-xs text-secondary font-semibold mb-1">VICE CAPTAIN (1.5x)</div>
            <div className="font-bold text-sm">{vc.player.name}</div>
            <div className="text-xs text-muted">{vc.player.team} · {vc.player.role}</div>
          </div>
        )}
      </div>

      {/* Players by role */}
      {byRole.map(({ role, players }) => (
        <div key={role}>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            {roleLabel[role]} ({players.length})
          </h2>
          <div className="space-y-2">
            {players.map((p) => (
              <div
                key={p.playerId}
                className={`bg-card border rounded-lg px-4 py-3 flex items-center justify-between ${
                  p.isCaptain
                    ? "border-primary/50"
                    : p.isViceCaptain
                    ? "border-secondary/50"
                    : "border-border"
                }`}
              >
                <div>
                  <div className="font-medium text-sm">
                    {p.player?.name ?? "Unknown"}
                    {p.isCaptain && (
                      <span className="ml-2 text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded">C</span>
                    )}
                    {p.isViceCaptain && (
                      <span className="ml-2 text-[10px] font-bold bg-secondary/20 text-secondary px-1.5 py-0.5 rounded">VC</span>
                    )}
                  </div>
                  <div className="text-xs text-muted">{p.player?.team}</div>
                </div>
                <div className="text-sm font-semibold text-muted">
                  {p.player?.creditPrice} Cr
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={() => router.back()}
        className="w-full bg-card border border-border text-sm font-semibold rounded-lg py-2.5 hover:bg-card-hover transition-colors"
      >
        ← Back
      </button>
    </div>
  );
}
