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

export default function EntryDetailPage() {
  const { id: contestId, entryId } = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [teamHidden, setTeamHidden] = useState(false);
  const [loading, setLoading] = useState(true);

  function loadEntry() {
    return fetch(`/api/contests/${contestId}/entry/${entryId}`)
      .then((r) => r.json())
      .then((data) => {
        setEntry(data.entry);
        setIsOwner(data.isOwner);
        setTeamHidden(data.teamHidden ?? false);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadEntry();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId, entryId]);

  // Auto-refresh every 60s during live matches to show updating player points
  useEffect(() => {
    if (!entry) return;
    const matchStarted = entry.contest.match.status !== "UPCOMING" || new Date(entry.contest.match.date) <= new Date();
    if (!matchStarted || entry.contest.status === "COMPLETED") return;
    const interval = setInterval(() => loadEntry(), 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.contest.match.status, entry?.contest.status, contestId, entryId]);

  if (loading) return <div className="text-muted">Loading...</div>;
  if (!entry) return <div className="text-danger">Team not found</div>;

  const matchStarted = new Date(entry.contest.match.date) <= new Date();
  const contestOpen = entry.contest.status === "OPEN";
  const canEdit = isOwner && !matchStarted && contestOpen;

  const captain = entry.team.find((p) => p.isCaptain);
  const vc = entry.team.find((p) => p.isViceCaptain);

  // Group by role
  const byRole = ROLE_ORDER.map((role) => ({
    role,
    players: entry.team.filter((p) => p.player?.role === role),
  })).filter((g) => g.players.length > 0);


  // Calculate effective points for a player (base * multiplier)
  function getEffectivePoints(p: TeamPlayer): number {
    const base = p.fantasyPoints;
    if (p.isCaptain) return base * 2;
    if (p.isViceCaptain) return base * 1.5;
    return base;
  }

  const hasAnyPoints = entry.team.some((p) => p.fantasyPoints > 0);

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

        {(entry.totalPoints > 0 || hasAnyPoints) && (
          <div className="flex gap-4 mt-3 pt-3 border-t border-border">
            <div>
              <div className="text-xs text-muted">Total Points</div>
              <div className="font-bold text-primary">{entry.totalPoints.toFixed(1)}</div>
            </div>
            {entry.prizeWon > 0 && (
              <div>
                <div className="text-xs text-muted">Prize Won</div>
                <div className="font-bold text-success">+{entry.prizeWon.toFixed(0)} vINR</div>
              </div>
            )}
            {matchStarted && entry.contest.status !== "COMPLETED" && (
              <div className="ml-auto flex items-center gap-1 text-xs text-danger">
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                Updating
              </div>
            )}
          </div>
        )}

        {canEdit && (
          <button
            onClick={() => router.push(`/contests/${contestId}/team?editEntryId=${entryId}`)}
            className="mt-3 w-full bg-primary text-white font-semibold rounded-lg py-2 text-sm hover:bg-primary-hover transition-colors"
          >
            Edit Team
          </button>
        )}
      </div>

      {/* Team hidden before match starts */}
      {teamHidden && (
        <div className="bg-card border border-border rounded-xl p-6 text-center text-muted">
          <div className="text-2xl mb-2">🔒</div>
          <div className="font-semibold text-foreground mb-1">Team locked until match starts</div>
          <div className="text-sm">You can&apos;t see other players&apos; teams before the match begins.</div>
        </div>
      )}

      {/* C/VC callout with points */}
      {!teamHidden && (
      <div className="grid grid-cols-2 gap-3">
        {captain?.player && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-center">
            <div className="text-xs text-primary font-semibold mb-1">CAPTAIN (2x)</div>
            <div className="font-bold text-sm">{captain.player.name}</div>
            <div className="text-xs text-muted">{captain.player.team} · {captain.player.role}</div>
            {(hasAnyPoints || matchStarted) && (
              <div className="mt-1.5 text-sm font-bold text-primary">{getEffectivePoints(captain).toFixed(1)} pts</div>
            )}
          </div>
        )}
        {vc?.player && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-xl p-3 text-center">
            <div className="text-xs text-secondary font-semibold mb-1">VICE CAPTAIN (1.5x)</div>
            <div className="font-bold text-sm">{vc.player.name}</div>
            <div className="text-xs text-muted">{vc.player.team} · {vc.player.role}</div>
            {(hasAnyPoints || matchStarted) && (
              <div className="mt-1.5 text-sm font-bold text-secondary">{getEffectivePoints(vc).toFixed(1)} pts</div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Players by role — with individual points */}
      {!teamHidden && byRole.map(({ role, players }) => (
        <div key={role}>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">
              {ROLE_LABELS[role]} ({players.length})
            </h2>
            <span className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Points</span>
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
                    <div className={`font-black text-base ${pts > 0 ? "text-success" : pts < 0 ? "text-danger" : "text-muted"}`}>
                      {pts > 0 ? "+" : ""}{pts.toFixed(1)}
                    </div>
                    {(p.isCaptain || p.isViceCaptain) && p.fantasyPoints !== 0 && (
                      <div className="text-[9px] text-muted font-black uppercase tracking-tighter opacity-70">
                        {p.fantasyPoints.toFixed(1)} x{p.isCaptain ? "2" : "1.5"}
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
        &larr; Back
      </button>
    </div>
  );
}
