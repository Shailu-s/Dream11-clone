"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ROLE_ORDER, ROLE_LABELS } from "@/lib/utils";

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
  fantasyPoints: number;
}

interface SavedTeamDetail {
  id: string;
  teamName: string;
  players: TeamPlayer[];
  match: { id: string; team1: string; team2: string; date: string; status: string };
}


export default function SavedTeamDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [team, setTeam] = useState<SavedTeamDetail | null>(null);
  const [loading, setLoading] = useState(true);

  function loadTeam() {
    return fetch(`/api/teams/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTeam(data.team ?? null);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadTeam();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-refresh for live teams
  useEffect(() => {
    if (!team) return;
    if (team.match.status !== "LIVE") return;
    const interval = setInterval(() => loadTeam(), 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.match.status, id]);

  if (loading) return <div className="text-muted">Loading...</div>;
  if (!team) return <div className="text-danger">Team not found</div>;

  const matchUpcoming = team.match.status === "UPCOMING";
  const matchStarted = team.match.status !== "UPCOMING";
  const captain = team.players.find((p) => p.isCaptain);
  const vc = team.players.find((p) => p.isViceCaptain);

  const byRole = ROLE_ORDER.map((role) => ({
    role,
    players: team.players.filter((p) => p.player?.role === role),
  })).filter((g) => g.players.length > 0);

  function getEffectivePoints(p: TeamPlayer): number {
    const base = p.fantasyPoints;
    if (p.isCaptain) return base * 2;
    if (p.isViceCaptain) return base * 1.5;
    return base;
  }

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
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
            matchUpcoming ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
          }`}>
            {team.match.status}
          </span>
        </div>

        {matchUpcoming ? (
          <button
            onClick={() => router.push(`/matches/${team.match.id}/team?editTeamId=${team.id}`)}
            className="mt-3 w-full bg-primary text-white font-semibold rounded-lg py-2 text-sm hover:bg-primary-hover transition-colors"
          >
            Edit Team
          </button>
        ) : (
          <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
            <div className="text-xs text-muted font-bold uppercase tracking-widest">Live Points Summary</div>
            <div className="text-lg font-black text-primary">
              {team.players.reduce((sum, p) => sum + getEffectivePoints(p), 0).toFixed(1)}
            </div>
          </div>
        )}
      </div>

      {/* C/VC callout */}
      <div className="grid grid-cols-2 gap-3">
        {captain?.player && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-center">
            <div className="text-xs text-primary font-semibold mb-1">CAPTAIN (2x)</div>
            <div className="font-bold text-sm">{captain.player.name}</div>
            <div className="text-xs text-muted mb-1">{captain.player.team} · {captain.player.role}</div>
            {matchStarted && (
              <div className="text-sm font-black text-primary">{getEffectivePoints(captain).toFixed(1)} pts</div>
            )}
          </div>
        )}
        {vc?.player && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-3 text-center">
            <div className="text-xs text-secondary font-semibold mb-1">VICE CAPTAIN (1.5x)</div>
            <div className="font-bold text-sm">{vc.player.name}</div>
            <div className="text-xs text-muted mb-1">{vc.player.team} · {vc.player.role}</div>
            {matchStarted && (
              <div className="text-sm font-black text-secondary">{getEffectivePoints(vc).toFixed(1)} pts</div>
            )}
          </div>
        )}
      </div>

      {/* Players by role */}
      {byRole.map(({ role, players }) => (
        <div key={role}>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">
              {ROLE_LABELS[role]} ({players.length})
            </h2>
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">
              {matchStarted ? "Points" : "Credits"}
            </span>
          </div>
          <div className="space-y-2">
            {players.map((p) => {
              const pts = getEffectivePoints(p);
              return (
                <div
                  key={p.playerId}
                  className={`bg-card border-2 rounded-2xl px-4 py-3 flex items-center justify-between transition-all ${
                    p.isCaptain
                      ? "border-primary/40 bg-primary/5"
                      : p.isViceCaptain
                      ? "border-secondary/40 bg-secondary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full bg-muted/20 flex items-center justify-center font-black text-xs border-2 ${
                        p.isCaptain ? "border-primary text-primary" : p.isViceCaptain ? "border-secondary text-secondary" : "border-border text-muted"
                      }`}>
                        {p.player?.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      {p.isCaptain && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-card shadow-lg shadow-primary/30">C</span>
                      )}
                      {p.isViceCaptain && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-card shadow-lg shadow-secondary/30">VC</span>
                      )}
                    </div>
                    <div>
                      <div className="font-black text-sm group-hover:text-primary transition-colors">
                        {p.player?.name ?? "Unknown"}
                      </div>
                      <div className="text-[10px] text-muted font-bold uppercase tracking-tight">
                        {p.player?.team} &middot; {p.player?.role}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {matchStarted ? (
                      <>
                        <div className={`font-black text-base ${pts > 0 ? "text-success" : pts < 0 ? "text-danger" : "text-muted"}`}>
                          {pts > 0 ? "+" : ""}{pts.toFixed(1)}
                        </div>
                        {(p.isCaptain || p.isViceCaptain) && p.fantasyPoints !== 0 && (
                          <div className="text-[9px] text-muted font-black uppercase tracking-tighter opacity-70">
                            {p.fantasyPoints.toFixed(1)} x{p.isCaptain ? "2" : "1.5"}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm font-black text-foreground">
                        {p.player?.creditPrice} <span className="text-[10px] text-muted">Cr</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
