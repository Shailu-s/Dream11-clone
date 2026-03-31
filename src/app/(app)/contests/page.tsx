"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, getTeamInfo } from "@/lib/utils";
import { Countdown } from "@/components/Countdown";

interface Contest {
  id: string;
  name: string;
  entryFee: number;
  prizePool: number;
  maxParticipants: number | null;
  inviteCode: string;
  status: string;
  isJoined: boolean;
  creator: { username: string };
  _count: { entries: number };
  match: { id: string; team1: string; team2: string; date: string; venue: string };
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
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-2xl font-black tracking-tight">WGF</h1>
          <p className="text-xs text-muted font-medium">who gets fucked</p>
        </div>
        <button
          onClick={() => setShowJoinInput(!showJoinInput)}
          className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-bold hover:bg-primary/20 transition-all"
        >
          <span className="text-lg leading-none">+</span>
          JOIN BY CODE
        </button>
      </div>

      {showJoinInput && (
        <form onSubmit={handleJoinByCode} className="flex gap-2 bg-card p-3 rounded-xl border border-primary/20 shadow-lg shadow-primary/5">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ENTER 6-DIGIT CODE"
            maxLength={6}
            autoFocus
            className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm font-black tracking-[0.3em] text-center focus:outline-none focus:border-primary transition-all"
            required
          />
          <button
            type="submit"
            disabled={joinLoading || joinCode.length < 6}
            className="bg-primary text-white text-xs font-black rounded-lg px-6 py-2 hover:brightness-110 disabled:opacity-50 transition-all uppercase"
          >
            {joinLoading ? "..." : "Join"}
          </button>
        </form>
      )}
      {joinError && <p className="text-danger text-xs font-bold px-4">{joinError}</p>}

      {/* Tabs */}
      <div className="flex gap-1 bg-card/50 backdrop-blur-sm rounded-xl p-1 border border-border sticky top-4 z-10">
        <button
          onClick={() => setTab("available")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            tab === "available" ? "bg-primary text-white shadow-md" : "text-muted hover:text-foreground"
          }`}
        >
          Available
          {openContests.filter((c) => !c.isJoined).length > 0 && (
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${tab === "available" ? "bg-white/20" : "bg-primary/10 text-primary"}`}>
              {openContests.filter((c) => !c.isJoined).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            tab === "mine" ? "bg-primary text-white shadow-md" : "text-muted hover:text-foreground"
          }`}
        >
          My Contests
          {activeEntries.length > 0 && (
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${tab === "mine" ? "bg-white/20" : "bg-primary/10 text-primary"}`}>
              {activeEntries.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs font-bold text-muted animate-pulse uppercase tracking-widest">Loading Field...</p>
        </div>
      ) : tab === "available" ? (
        <div className="space-y-4">
          {openContests.length === 0 ? (
            <div className="bg-card border-2 border-dashed border-border rounded-2xl p-10 text-center">
              <div className="text-4xl mb-4">🏏</div>
              <p className="text-sm font-bold text-muted uppercase tracking-tight">No open contests right now.</p>
              <p className="text-xs text-muted mt-1">Create one from a match or wait for others!</p>
            </div>
          ) : (
            openContests.map((contest) => {
              const t1 = getTeamInfo(contest.match.team1);
              const t2 = getTeamInfo(contest.match.team2);
              const spotsLeft = contest.maxParticipants ? contest.maxParticipants - contest._count.entries : null;
              const progress = contest.maxParticipants ? (contest._count.entries / contest.maxParticipants) * 100 : 0;

              return (
                <div
                  key={contest.id}
                  onClick={() => router.push(`/contests/${contest.id}`)}
                  className={`bg-card border-2 rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 group ${contest.isJoined ? "border-primary/30" : "border-border"}`}
                >
                  {/* Match Header */}
                  <div className="bg-muted/30 px-4 py-2 flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1.5">
                        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
                          <img src={t1.logo} alt={t1.initials} className="w-full h-full object-contain" />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
                          <img src={t2.logo} alt={t2.initials} className="w-full h-full object-contain" />
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-muted uppercase tracking-wider">{t1.initials} vs {t2.initials}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted">{formatDate(new Date(contest.match.date))}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-black text-lg leading-tight group-hover:text-primary transition-colors">{contest.name}</h3>
                        <p className="text-[10px] text-muted font-bold uppercase mt-0.5 tracking-tight">Organized by @{contest.creator.username}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {contest.isJoined ? (
                          <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-primary/20">
                            Joined
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 bg-success/10 border border-success/20 px-2 py-1 rounded-full">
                            <span className="text-success text-[10px] font-black uppercase tracking-wider">
                              Upcoming
                            </span>
                            <div className="w-[1px] h-3 bg-success/20" />
                            <Countdown targetDate={contest.match.date} className="text-success" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-muted/20 p-3 rounded-xl">
                        <p className="text-[10px] text-muted font-black uppercase tracking-wider mb-1">Prize Pool</p>
                        <p className="text-lg font-black text-foreground">₹{contest.prizePool}</p>
                      </div>
                      <div className="bg-muted/20 p-3 rounded-xl text-right">
                        <p className="text-[10px] text-muted font-black uppercase tracking-wider mb-1">Entry Fee</p>
                        <p className="text-lg font-black text-primary">₹{contest.entryFee}</p>
                      </div>
                    </div>

                    {contest.maxParticipants && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                          <span className="text-primary">{contest._count.entries} joined</span>
                          <span className="text-muted">{contest.maxParticipants} spots</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500 rounded-full" 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-[9px] font-bold text-danger text-right uppercase italic">
                          {spotsLeft} spots left!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {activeEntries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xs font-black text-muted uppercase tracking-[0.2em]">Active Field</h2>
                <div className="h-[1px] flex-1 bg-border mx-4" />
              </div>
              <div className="space-y-3">
                {activeEntries.map((entry) => {
                  const t1 = getTeamInfo(entry.contest.match.team1);
                  const t2 = getTeamInfo(entry.contest.match.team2);
                  return (
                    <button
                      key={entry.id}
                      onClick={() => router.push(`/contests/${entry.contest.id}`)}
                      className="w-full text-left bg-card border-2 border-border rounded-2xl p-4 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5 group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-1.5">
                            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
                              <img src={t1.logo} alt={t1.initials} className="w-full h-full object-contain" />
                            </div>
                            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
                              <img src={t2.logo} alt={t2.initials} className="w-full h-full object-contain" />
                            </div>
                          </div>
                          <div>
                            <div className="font-black text-sm group-hover:text-primary transition-colors">{entry.contest.name}</div>
                            <div className="text-[10px] text-muted font-bold uppercase tracking-tight">
                              {t1.initials} vs {t2.initials}
                            </div>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                          entry.contest.status === "LOCKED" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-success/10 text-success border border-success/20"
                        }`}>
                          {entry.contest.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-muted/20 rounded-xl px-3 py-2">
                        <div className="text-[10px] font-black text-muted uppercase tracking-wider">
                          Team: <span className="text-foreground">{entry.teamName}</span>
                        </div>
                        <div className="text-primary text-[10px] font-black uppercase tracking-wider">
                          View Details &rarr;
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {pastEntries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xs font-black text-muted uppercase tracking-[0.2em]">Match History</h2>
                <div className="h-[1px] flex-1 bg-border mx-4" />
              </div>
              <div className="space-y-2">
                {pastEntries.slice(0, 10).map((entry) => {
                  const isWinner = entry.prizeWon > 0;
                  const pt1 = getTeamInfo(entry.contest.match.team1);
                  const pt2 = getTeamInfo(entry.contest.match.team2);
                  return (
                    <button
                      key={entry.id}
                      onClick={() => router.push(`/contests/${entry.contest.id}`)}
                      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:bg-card-hover transition-colors opacity-90"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-1.5">
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
                              <img src={pt1.logo} alt={pt1.initials} className="w-full h-full object-contain" />
                            </div>
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
                              <img src={pt2.logo} alt={pt2.initials} className="w-full h-full object-contain" />
                            </div>
                          </div>
                          <div>
                            <div className="font-bold text-sm">{entry.contest.name}</div>
                            <div className="text-[10px] text-muted font-bold uppercase mt-0.5">
                              {pt1.initials} vs {pt2.initials} &middot; {entry.teamName}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {entry.rank && (
                            <div className={`text-sm font-black ${isWinner ? "text-success" : "text-foreground"}`}>
                              #{entry.rank}
                            </div>
                          )}
                          {isWinner ? (
                            <div className="text-[10px] text-success font-black uppercase tracking-wider">
                              +₹{entry.prizeWon}
                            </div>
                          ) : (
                            <div className="text-[10px] text-muted font-bold uppercase tracking-wider">
                              {entry.totalPoints.toFixed(1)} PTS
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {myEntries.length === 0 && (
            <div className="bg-card border-2 border-dashed border-border rounded-2xl p-10 text-center">
              <div className="text-4xl mb-4">🏆</div>
              <p className="text-sm font-bold text-muted uppercase tracking-tight">You haven&apos;t joined any contests yet.</p>
              <button 
                onClick={() => setTab("available")} 
                className="mt-4 bg-primary/10 text-primary px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-primary/20 transition-all"
              >
                Browse Contests
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
