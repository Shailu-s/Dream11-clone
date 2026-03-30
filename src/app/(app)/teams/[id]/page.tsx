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

interface SavedTeamDetail {
  id: string;
  teamName: string;
  players: TeamPlayer[];
  match: { id: string; team1: string; team2: string; date: string; status: string };
}

const ROLE_ORDER = ["WK", "BAT", "AR", "BOWL"];
const roleLabel: Record<string, string> = {
  WK: "Wicket Keeper",
  BAT: "Batters",
  AR: "All Rounders",
  BOWL: "Bowlers",
};

export default function SavedTeamDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [team, setTeam] = useState<SavedTeamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teams/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTeam(data.team ?? null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="text-muted">Loading...</div>;
  if (!team) return <div className="text-danger">Team not found</div>;

  const matchUpcoming = team.match.status === "UPCOMING";
  const captain = team.players.find((p) => p.isCaptain);
  const vc = team.players.find((p) => p.isViceCaptain);

  const byRole = ROLE_ORDER.map((role) => ({
    role,
    players: team.players.filter((p) => p.player?.role === role),
  })).filter((g) => g.players.length > 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{team.teamName}</h1>
            <div className="text-sm text-muted mt-0.5">
              {team.match.team1} vs {team.match.team2}
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            matchUpcoming ? "bg-success/20 text-success" : "bg-muted/20 text-muted"
          }`}>
            {team.match.status}
          </span>
        </div>

        {matchUpcoming && (
          <button
            onClick={() => router.push(`/matches/${team.match.id}/team?editTeamId=${team.id}`)}
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
