"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, getTeamInfo } from "@/lib/utils";
import { useCountdown } from "@/components/Countdown";

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
  match: {
    team1: string; team2: string; date: string; venue: string; status: string;
    result?: string | null;
    scores?: Array<{ r: number; w: number; o: number; inning: string }> | null;
    toss?: string | null;
  };
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

interface ScorecardRow {
  playerId: string;
  name: string;
  team: string;
  role: string;
  runs: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  wickets: number;
  oversBowled: number;
  maidens: number;
  runsConceded: number;
  catches: number;
  stumpings: number;
  runOutsDirect: number;
  runOutsIndirect: number;
  didBat: boolean;
  isInPlayingXI: boolean;
  fantasyPoints: number;
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
  const [scorecard, setScorecard] = useState<ScorecardRow[]>([]);
  const [scorecardTeam, setScorecardTeam] = useState<string | null>(null);

  const loadContest = (c: typeof id) => {
    return fetch(`/api/contests/${c}`)
      .then((r) => r.json())
      .then((data) => {
        setContest(data.contest);
        setIsParticipant(data.isParticipant);
        setIsCreator(data.isCreator);
        setUserId(data.userId);
        setScorecard(data.scorecard || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadContest(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-refresh every 60s during LIVE matches so users see score updates
  useEffect(() => {
    if (!contest) return;
    const isMatchLive = contest.match.status === "LIVE" || new Date(contest.match.date) <= new Date();
    if (!isMatchLive || contest.status === "COMPLETED") return;
    const interval = setInterval(() => loadContest(id), 60_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contest?.match.status, contest?.status, id]);

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
    const text = `Join my WGF contest "${contest.name}" for ${contest.match.team1} vs ${contest.match.team2}!\nEntry: ${contest.entryFee} tokens\nCode: ${contest.inviteCode}\n${window.location.href}`;
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const matchDate = contest ? new Date(contest.match.date) : null;
  const { countdown, minutesUntil } = useCountdown(matchDate);

  if (loading) return <div className="text-muted">Loading...</div>;
  if (!contest) return <div className="text-danger">Contest not found</div>;

  const matchStarted = new Date(contest.match.date) <= new Date();
  const canJoin = contest.status === "OPEN" && !isParticipant && !matchStarted;
  const canAddTeam = contest.status === "OPEN" && isParticipant && !matchStarted;

  // Scorecard helpers — extracted so we can render inside the top card
  const team1 = contest.match.team1;
  const team2 = contest.match.team2;
  const ALIASES: Record<string, string[]> = {
    CSK: ["chennai super kings"], MI: ["mumbai indians"],
    RCB: ["royal challengers"], KKR: ["kolkata knight riders"],
    DC: ["delhi capitals"], PBKS: ["punjab kings"],
    RR: ["rajasthan royals"], SRH: ["sunrisers hyderabad"],
    GT: ["gujarat titans"], LSG: ["lucknow super giants"],
  };
  const scores = contest.match.scores;
  const getScore = (teamCode: string) => {
    const aliases = [teamCode.toLowerCase(), ...(ALIASES[teamCode] || [])];
    return scores?.find((s: { r: number; w: number; o: number; inning: string }) =>
      aliases.some(a => s.inning.toLowerCase().includes(a))
    );
  };
  const s1 = getScore(team1);
  const s2 = getScore(team2);
  const t1 = getTeamInfo(team1);
  const t2 = getTeamInfo(team2);
  const hasScores = !!(s1 || s2);
  const activeTeam = scorecardTeam || team1;
  const teamRows = scorecard.filter(r => r.team === activeTeam);
  const batters = teamRows.filter(r => r.didBat || r.runs > 0).sort((a, b) => b.runs - a.runs);
  const bowlers = scorecard.filter(r => r.team !== activeTeam && r.oversBowled > 0).sort((a, b) => b.wickets - a.wickets || a.runsConceded / (a.oversBowled || 1) - b.runsConceded / (b.oversBowled || 1));

  return (
    <div>
      <div className="bg-card rounded-xl border border-border mb-4 overflow-hidden">

        {/* ── Top header: name + status ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h1 className="text-base font-bold leading-tight">{contest.name}</h1>
            <p className="text-muted text-xs">by @{contest.creator.username}</p>
          </div>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
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

        {/* ── Scores / match header ── */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-3 mb-0.5">
            {/* Team logos stacked */}
            <div className="flex -space-x-1.5 shrink-0">
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
                <img src={t1.logo} alt={t1.initials} className="w-full h-full object-contain" />
              </div>
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
                <img src={t2.logo} alt={t2.initials} className="w-full h-full object-contain" />
              </div>
            </div>

            {hasScores ? (
              <div className="flex items-baseline gap-1.5 flex-1 min-w-0 text-sm font-bold">
                <span>{t1.initials}</span>
                {s1 ? <span>{s1.r}/{s1.w} <span className="text-[11px] text-muted font-normal">({s1.o})</span></span> : <span className="text-muted text-xs font-normal">-</span>}
                <span className="text-muted text-xs font-normal">vs</span>
                <span>{t2.initials}</span>
                {s2 ? <span>{s2.r}/{s2.w} <span className="text-[11px] text-muted font-normal">({s2.o})</span></span> : <span className="text-muted text-xs font-normal">-</span>}
              </div>
            ) : (
              <div className="text-base font-bold flex-1">
                {t1.initials} <span className="text-muted font-normal text-sm">vs</span> {t2.initials}
              </div>
            )}

            {/* Live / countdown badge pinned right */}
            {contest.match.status === "LIVE" ? (
              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-danger/15 text-danger">
                <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                Live
              </span>
            ) : !matchStarted && minutesUntil > 0 ? (
              <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                minutesUntil <= 60 ? "bg-danger/15 text-danger" : "bg-primary/15 text-primary"
              }`}>
                ⏱ {countdown}
              </span>
            ) : null}
          </div>

          {contest.match.result && (
            <div className="text-[11px] font-semibold text-success mt-0.5">{contest.match.result}</div>
          )}
          <div className="text-[11px] text-muted mt-0.5">
            {formatDate(new Date(contest.match.date))} · {contest.match.venue}
          </div>
        </div>

        {/* ── Collapsible scorecard — lives INSIDE the top card ── */}
        {scorecard.length > 0 && (
          <details className="group border-t border-border">
            <summary className="cursor-pointer list-none select-none flex items-center justify-between px-4 py-2 hover:bg-background/50 transition-colors">
              <span className="text-xs font-semibold text-muted uppercase tracking-wide">Scorecard</span>
              <span className="text-[10px] text-muted group-open:hidden">▼ Show</span>
              <span className="text-[10px] text-muted hidden group-open:inline">▲ Hide</span>
            </summary>

            <div className="px-3 pb-3 space-y-2 bg-background/30">
              {/* Team tabs */}
              <div className="flex gap-2 pt-2">
                {[team1, team2].map(team => (
                  <button key={team} onClick={() => setScorecardTeam(team)}
                    className={`flex-1 py-1 rounded-md text-xs font-semibold transition-colors ${activeTeam === team ? "bg-primary text-white" : "bg-card border border-border text-muted"}`}>
                    {team}
                  </button>
                ))}
              </div>

              {/* Batting */}
              {batters.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-background px-3 py-1.5 text-[10px] font-bold text-muted uppercase tracking-wide">Batting</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-t border-border text-muted">
                          <th className="px-3 py-1.5 text-left font-medium">Player</th>
                          <th className="px-2 py-1.5 text-right font-medium">R</th>
                          <th className="px-2 py-1.5 text-right font-medium">B</th>
                          <th className="px-2 py-1.5 text-right font-medium">4s</th>
                          <th className="px-2 py-1.5 text-right font-medium">6s</th>
                          <th className="px-2 py-1.5 text-right font-medium">SR</th>
                          <th className="px-2 py-1.5 text-right font-medium text-primary">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batters.map(p => {
                          const sr = p.ballsFaced > 0 ? ((p.runs / p.ballsFaced) * 100).toFixed(1) : "-";
                          return (
                            <tr key={p.playerId} className="border-t border-border">
                              <td className="px-3 py-1.5"><div className="font-medium">{p.name}</div><div className="text-[9px] text-muted">{p.role}</div></td>
                              <td className="px-2 py-1.5 text-right font-bold">{p.runs}</td>
                              <td className="px-2 py-1.5 text-right text-muted">{p.ballsFaced}</td>
                              <td className="px-2 py-1.5 text-right text-muted">{p.fours}</td>
                              <td className="px-2 py-1.5 text-right text-muted">{p.sixes}</td>
                              <td className="px-2 py-1.5 text-right text-muted">{sr}</td>
                              <td className="px-2 py-1.5 text-right font-semibold text-primary">{p.fantasyPoints.toFixed(0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Bowling */}
              {bowlers.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-background px-3 py-1.5 text-[10px] font-bold text-muted uppercase tracking-wide">Bowling</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-t border-border text-muted">
                          <th className="px-3 py-1.5 text-left font-medium">Player</th>
                          <th className="px-2 py-1.5 text-right font-medium">O</th>
                          <th className="px-2 py-1.5 text-right font-medium">M</th>
                          <th className="px-2 py-1.5 text-right font-medium">R</th>
                          <th className="px-2 py-1.5 text-right font-medium">W</th>
                          <th className="px-2 py-1.5 text-right font-medium">Eco</th>
                          <th className="px-2 py-1.5 text-right font-medium text-primary">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bowlers.map(p => {
                          const eco = p.oversBowled > 0 ? (p.runsConceded / p.oversBowled).toFixed(1) : "-";
                          return (
                            <tr key={p.playerId} className="border-t border-border">
                              <td className="px-3 py-1.5"><div className="font-medium">{p.name}</div><div className="text-[9px] text-muted">{p.role}</div></td>
                              <td className="px-2 py-1.5 text-right text-muted">{p.oversBowled}</td>
                              <td className="px-2 py-1.5 text-right text-muted">{p.maidens}</td>
                              <td className="px-2 py-1.5 text-right text-muted">{p.runsConceded}</td>
                              <td className="px-2 py-1.5 text-right font-bold">{p.wickets}</td>
                              <td className="px-2 py-1.5 text-right text-muted">{eco}</td>
                              <td className="px-2 py-1.5 text-right font-semibold text-primary">{p.fantasyPoints.toFixed(0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {batters.length === 0 && bowlers.length === 0 && (
                <div className="text-xs text-muted text-center py-3">No stats for {activeTeam} yet</div>
              )}
            </div>
          </details>
        )}

        {/* ── Compact stats row: Entry Fee · Prize Pool · Players ── */}
        <div className="flex border-t border-border divide-x divide-border text-center">
          <div className="flex-1 py-2.5 px-2">
            <div className="text-[10px] text-muted">Entry</div>
            <div className="text-sm font-bold text-primary">{contest.entryFee}<span className="text-[10px] font-normal text-muted ml-0.5">vINR</span></div>
          </div>
          <div className="flex-1 py-2.5 px-2">
            <div className="text-[10px] text-muted">Prize Pool</div>
            <div className="text-sm font-bold text-success">{contest.calculatedPrizePool.toFixed(0)}<span className="text-[10px] font-normal text-muted ml-0.5">vINR</span></div>
          </div>
          <div className="flex-1 py-2.5 px-2">
            <div className="text-[10px] text-muted">Teams</div>
            <div className="text-sm font-bold">{contest._count.entries}</div>
          </div>
        </div>

        {/* ── Prize distribution ── */}
        <div className="border-t border-border px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[10px] text-muted uppercase tracking-wide">Prizes</span>
          {contest.prizeDistribution.map((pd) => (
            <span key={pd.rank} className="text-xs">
              <span className="text-muted">#{pd.rank}</span>{" "}
              <span className="font-semibold text-success">{((contest.calculatedPrizePool * pd.percentage) / 100).toFixed(0)}</span>
              <span className="text-muted text-[10px]"> vINR</span>
            </span>
          ))}
        </div>

        {/* ── Compact invite code row ── */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-2">
          <span className="text-[10px] text-muted uppercase tracking-wide shrink-0">Code</span>
          <span className="font-mono text-sm font-bold tracking-widest text-foreground flex-1">{contest.inviteCode}</span>
          <button
            onClick={copyInviteCode}
            className="text-xs px-2.5 py-1 rounded-md bg-background border border-border hover:bg-card-hover transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={shareContest}
            className="text-xs px-2.5 py-1 rounded-md bg-secondary text-white hover:bg-secondary/80 transition-colors"
          >
            Share
          </button>
        </div>

        {/* ── CTA buttons ── */}
        {(isCreator && !isParticipant && contest.status === "OPEN") || canJoin || canAddTeam ? (
          <div className="border-t border-border px-4 py-3">
            {isCreator && !isParticipant && contest.status === "OPEN" && (
              <div className="text-xs text-primary bg-primary/10 rounded-lg px-3 py-2 mb-2">
                You created this contest — pick your team to join!
              </div>
            )}
            {canJoin && (
              <button
                onClick={() => router.push(`/contests/${id}/team`)}
                className="w-full bg-primary text-white font-semibold rounded-lg py-2.5 hover:bg-primary-hover transition-colors text-sm"
              >
                {isCreator ? "Pick My Team & Join" : `Join Contest (${contest.entryFee} vINR)`}
              </button>
            )}
            {canAddTeam && (
              <button
                onClick={() => router.push(`/contests/${id}/team`)}
                className="w-full bg-secondary text-white font-semibold rounded-lg py-2.5 hover:bg-secondary/80 transition-colors text-sm"
              >
                Add Another Team
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">
          {contest.status === "COMPLETED" ? "Final Leaderboard" : "Participants"}
        </h2>
        {contest.match.status === "LIVE" && (
          <span className="text-xs text-danger flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
            Live scores
          </span>
        )}
      </div>

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
                className="bg-primary text-white text-sm font-semibold rounded-lg px-4 py-2 hover:bg-primary-hover disabled:opacity-50 transition-colors"
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
