"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ROLE_ORDER } from "@/lib/utils";

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

interface CompareEntry {
  id: string;
  teamName: string;
  totalPoints: number;
  rank: number | null;
  user: { username: string };
  team: TeamPlayer[];
}

function getEffectivePoints(p: TeamPlayer): number {
  const base = p.fantasyPoints;
  if (p.isCaptain) return base * 2;
  if (p.isViceCaptain) return base * 1.5;
  return base;
}

function roleIndex(role: string | undefined): number {
  const i = ROLE_ORDER.indexOf(role as any);
  return i === -1 ? 99 : i;
}

/** Returns a C/VC tag string for sorting: "C" first, "VC" second, "" last */
function cvcPriority(p: TeamPlayer): number {
  if (p.isCaptain) return 0;
  if (p.isViceCaptain) return 1;
  return 2;
}

export default function ComparePage() {
  const { id: contestId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const entry1Id = searchParams.get("entry1");
  const entry2Id = searchParams.get("entry2");

  const [entry1, setEntry1] = useState<CompareEntry | null>(null);
  const [entry2, setEntry2] = useState<CompareEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!entry1Id || !entry2Id) {
      setError("Select two teams to compare");
      setLoading(false);
      return;
    }
    fetch(`/api/contests/${contestId}/compare?entry1=${entry1Id}&entry2=${entry2Id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setEntry1(data.entry1);
          setEntry2(data.entry2);
        }
        setLoading(false);
      });
  }, [contestId, entry1Id, entry2Id]);

  if (loading) return <div className="text-muted">Loading...</div>;
  if (error) return <div className="text-danger text-center py-8">{error}</div>;
  if (!entry1 || !entry2) return null;

  // Build lookup maps
  const team1Ids = new Set(entry1.team.map(p => p.playerId));
  const team2Ids = new Set(entry2.team.map(p => p.playerId));
  const team1Map = new Map(entry1.team.map(p => [p.playerId, p]));
  const team2Map = new Map(entry2.team.map(p => [p.playerId, p]));

  // Players in both teams
  const sharedIds = [...team1Ids].filter(id => team2Ids.has(id));
  // Players unique to one team
  const only1Ids = [...team1Ids].filter(id => !team2Ids.has(id));
  const only2Ids = [...team2Ids].filter(id => !team1Ids.has(id));

  // Split shared players into: same C/VC role vs different C/VC role
  const diffCvcIds: string[] = []; // shared player but C/VC role differs
  const sameIds: string[] = [];     // shared player AND same C/VC role
  for (const id of sharedIds) {
    const p1 = team1Map.get(id)!;
    const p2 = team2Map.get(id)!;
    if (p1.isCaptain !== p2.isCaptain || p1.isViceCaptain !== p2.isViceCaptain) {
      diffCvcIds.push(id);
    } else {
      sameIds.push(id);
    }
  }

  // Sort: diffCvcIds by C first, then VC, then role
  diffCvcIds.sort((a, b) => {
    const pa = team1Map.get(a)!;
    const pb = team1Map.get(b)!;
    const ca = Math.min(cvcPriority(pa), cvcPriority(team2Map.get(a)!));
    const cb = Math.min(cvcPriority(pb), cvcPriority(team2Map.get(b)!));
    if (ca !== cb) return ca - cb;
    return roleIndex(pa.player?.role) - roleIndex(pb.player?.role);
  });

  // Sort different players: C/VC first, then by role
  const sortDiff = (ids: string[], map: Map<string, TeamPlayer>) => {
    ids.sort((a, b) => {
      const pa = map.get(a)!;
      const pb = map.get(b)!;
      const ca = cvcPriority(pa);
      const cb = cvcPriority(pb);
      if (ca !== cb) return ca - cb;
      return roleIndex(pa.player?.role) - roleIndex(pb.player?.role);
    });
  };
  sortDiff(only1Ids, team1Map);
  sortDiff(only2Ids, team2Map);

  // Sort same players by role
  sameIds.sort((a, b) => roleIndex(team1Map.get(a)?.player?.role) - roleIndex(team1Map.get(b)?.player?.role));

  // Count total "different" items for the section header
  const totalDiffCount = diffCvcIds.length + only1Ids.length + only2Ids.length;

  const ptsDiff = entry1.totalPoints - entry2.totalPoints;

  return (
    <div className="space-y-4">
      {/* Header: Both teams side by side */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="p-3 text-center">
            <div className="text-sm font-bold truncate">{entry1.teamName}</div>
            <div className="text-xs text-muted">@{entry1.user.username}</div>
            <div className="text-lg font-black text-primary mt-1">{entry1.totalPoints.toFixed(1)}</div>
            <div className="text-[10px] text-muted">pts</div>
          </div>
          <div className="p-3 text-center">
            <div className="text-sm font-bold truncate">{entry2.teamName}</div>
            <div className="text-xs text-muted">@{entry2.user.username}</div>
            <div className="text-lg font-black text-primary mt-1">{entry2.totalPoints.toFixed(1)}</div>
            <div className="text-[10px] text-muted">pts</div>
          </div>
        </div>
        {ptsDiff !== 0 && (
          <div className="border-t border-border px-3 py-1.5 text-center text-xs font-semibold">
            <span className={ptsDiff > 0 ? "text-success" : "text-danger"}>
              {entry1.teamName} is {ptsDiff > 0 ? "ahead" : "behind"} by {Math.abs(ptsDiff).toFixed(1)} pts
            </span>
          </div>
        )}
      </div>

      {/* Different section: C/VC differences + unique players */}
      {totalDiffCount > 0 && (
        <div>
          <div className="text-[10px] font-black text-muted uppercase tracking-[0.2em] px-1 mb-2">
            Different ({totalDiffCount})
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Left column: team 1 view */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-center truncate px-1 text-primary">{entry1.teamName}</div>
              {diffCvcIds.map(id => <DiffCard key={`cvc-${id}`} p={team1Map.get(id)!} side="left" />)}
              {only1Ids.map(id => <DiffCard key={id} p={team1Map.get(id)!} side="left" />)}
              {diffCvcIds.length === 0 && only1Ids.length === 0 && (
                <div className="text-[10px] text-muted text-center py-3">None</div>
              )}
            </div>
            {/* Right column: team 2 view */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-center truncate px-1 text-secondary">{entry2.teamName}</div>
              {diffCvcIds.map(id => <DiffCard key={`cvc-${id}`} p={team2Map.get(id)!} side="right" />)}
              {only2Ids.map(id => <DiffCard key={id} p={team2Map.get(id)!} side="right" />)}
              {diffCvcIds.length === 0 && only2Ids.length === 0 && (
                <div className="text-[10px] text-muted text-center py-3">None</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Same Players */}
      {sameIds.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="text-[10px] font-black text-muted uppercase tracking-[0.2em]">
              Same Players ({sameIds.length})
            </div>
            <div className="text-[10px] text-success font-semibold">{sameIds.length}/11 overlap</div>
          </div>
          <div className="space-y-1.5">
            {sameIds.map(id => {
              const p1 = team1Map.get(id)!;
              const pts = getEffectivePoints(p1);
              return (
                <div key={id} className="bg-card border border-border rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Initials name={p1.player?.name} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {p1.player?.name ?? "Unknown"}
                          {(p1.isCaptain || p1.isViceCaptain) && (
                            <span className="ml-1.5 inline-block align-middle"><RoleBadge p={p1} /></span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted">{p1.player?.team} · {p1.player?.role}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs shrink-0">
                      <span className={`font-bold ${pts > 0 ? "text-success" : pts < 0 ? "text-danger" : "text-muted"}`}>
                        {pts > 0 ? "+" : ""}{pts.toFixed(1)}
                      </span>
                      <span className="text-muted"> pts</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-3 py-2 text-[10px] font-black text-muted uppercase tracking-[0.2em] border-b border-border">
          Stats
        </div>
        <div className="divide-y divide-border text-xs">
          <BreakdownRow label="Same players" val1={sameIds.length} val2={sameIds.length} />
          <BreakdownRow label="Different players" val1={only1Ids.length + diffCvcIds.length} val2={only2Ids.length + diffCvcIds.length} />
        </div>
      </div>

      <button
        onClick={() => router.back()}
        className="w-full bg-card border border-border text-sm font-semibold rounded-lg py-2.5 hover:bg-card-hover transition-colors"
      >
        &larr; Back to Contest
      </button>
    </div>
  );
}

function Initials({ name }: { name?: string | null }) {
  const letters = name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?";
  return (
    <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center text-[10px] font-black text-muted border border-border shrink-0">
      {letters}
    </div>
  );
}

function RoleBadge({ p }: { p: TeamPlayer }) {
  if (p.isCaptain) return <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold">C</span>;
  if (p.isViceCaptain) return <span className="px-1.5 py-0.5 rounded bg-secondary/20 text-secondary text-[10px] font-bold">VC</span>;
  return null;
}

function DiffCard({ p, side }: { p: TeamPlayer; side: "left" | "right" }) {
  const pts = getEffectivePoints(p);
  return (
    <div className={`bg-card border-2 rounded-lg p-2.5 ${
      side === "left" ? "border-primary/30 bg-primary/[0.03]" : "border-secondary/30 bg-secondary/[0.03]"
    }`}>
      <div className="flex items-center gap-1.5 mb-1">
        {(p.isCaptain || p.isViceCaptain) && <RoleBadge p={p} />}
        <div className="text-xs font-bold truncate">{p.player?.name ?? "Unknown"}</div>
      </div>
      <div className="text-[10px] text-muted">{p.player?.team} · {p.player?.role}</div>
      <div className={`text-xs font-bold mt-1 ${pts > 0 ? "text-success" : pts < 0 ? "text-danger" : "text-muted"}`}>
        {pts > 0 ? "+" : ""}{pts.toFixed(1)} pts
      </div>
    </div>
  );
}

function BreakdownRow({ label, val1, val2 }: { label: string; val1: number; val2: number }) {
  return (
    <div className="grid grid-cols-3 px-3 py-2">
      <div className="text-right font-semibold">{val1}</div>
      <div className="text-center text-muted">{label}</div>
      <div className="text-left font-semibold">{val2}</div>
    </div>
  );
}
