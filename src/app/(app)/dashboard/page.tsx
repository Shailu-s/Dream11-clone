"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getRelativeDate, getTeamInfo } from "@/lib/utils";
import { Countdown } from "@/components/Countdown";

interface Match {
  id: string;
  team1: string;
  team2: string;
  date: string;
  venue: string;
  status: string;
  _count: { contests: number };
}

interface SavedTeam {
  id: string;
  teamName: string;
  players: Array<{ playerId: string; isCaptain: boolean; isViceCaptain: boolean }>;
  matchId: string;
  createdAt: string;
  match: { id: string; team1: string; team2: string; date: string; status: string };
}

interface ContestEntry {
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [myEntries, setMyEntries] = useState<ContestEntry[]>([]);
  const [myTeams, setMyTeams] = useState<SavedTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"matches" | "my-contests" | "my-teams">("matches");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [upcomingRes, liveRes, recentRes, entriesRes, teamsRes] = await Promise.all([
          fetch("/api/matches?status=UPCOMING"),
          fetch("/api/matches?status=LIVE"),
          fetch("/api/matches?status=COMPLETED"),
          fetch("/api/contests/my-entries"),
          fetch("/api/teams"),
        ]);

        const upcomingData = await upcomingRes.json();
        const liveData = await liveRes.json();
        const recentData = await recentRes.json();
        const entriesData = await entriesRes.json();
        const teamsData = await teamsRes.json();

        setUpcomingMatches(upcomingData.matches || []);
        setLiveMatches(liveData.matches || []);
        setRecentMatches(recentData.matches || []);
        setMyEntries(entriesData.entries || []);
        setMyTeams(teamsData.teams || []);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const activeEntries = myEntries.filter(
    (e) => e.contest.status === "OPEN" || e.contest.status === "LOCKED"
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="bg-primary/10 border-2 border-primary/20 rounded-3xl p-6 relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-black tracking-tight">
            Let&apos;s start <span className="text-primary">Fourplay</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-primary text-xl font-black">₹{user?.tokenBalance.toLocaleString()}</span>
            <span className="text-[10px] font-black text-muted uppercase tracking-widest bg-white/50 px-2 py-0.5 rounded-full">Available Balance</span>
          </div>
        </div>
        {/* Bat hitting ball — decorative background */}
        <svg className="absolute -right-6 -bottom-6 opacity-10" width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Ball */}
          <circle cx="38" cy="38" r="28" fill="#c8702a" stroke="#a85b1f" strokeWidth="2"/>
          <path d="M18 28 Q38 48 58 28" stroke="white" strokeWidth="2" fill="none"/>
          <path d="M18 48 Q38 28 58 48" stroke="white" strokeWidth="2" fill="none"/>
          {/* Bat blade */}
          <rect x="58" y="42" width="36" height="90" rx="8" fill="#c8702a" transform="rotate(-40 58 42)"/>
          {/* Bat handle */}
          <rect x="112" y="28" width="10" height="52" rx="4" fill="#a85b1f" transform="rotate(-40 112 28)"/>
        </svg>
      </div>

      <div className="flex gap-1 bg-card/50 backdrop-blur-sm rounded-xl p-1 border border-border sticky top-4 z-10">
        <button
          onClick={() => setActiveTab("matches")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "matches" ? "bg-primary text-white shadow-md" : "text-muted hover:text-foreground"
          }`}
        >
          Matches
        </button>
        <button
          onClick={() => setActiveTab("my-contests")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all relative ${
            activeTab === "my-contests" ? "bg-primary text-white shadow-md" : "text-muted hover:text-foreground"
          }`}
        >
          My Contests
          {activeEntries.length > 0 && (
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "my-contests" ? "bg-white/20" : "bg-primary/10 text-primary"}`}>
              {activeEntries.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("my-teams")}
          className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "my-teams" ? "bg-primary text-white shadow-md" : "text-muted hover:text-foreground"
          }`}
        >
          My Teams
          {myTeams.length > 0 && (
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === "my-teams" ? "bg-white/20" : "bg-primary/10 text-primary"}`}>
              {myTeams.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "matches" ? (
        <div className="space-y-8">
          {/* Live Matches */}
          {liveMatches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xs font-black text-danger uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                  Live Action
                </h2>
                <div className="h-[1px] flex-1 bg-danger/20 mx-4" />
              </div>
              <div className="space-y-3">
                {liveMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Matches */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xs font-black text-muted uppercase tracking-[0.2em]">Next Battles</h2>
              <div className="h-[1px] flex-1 bg-border mx-4" />
            </div>
            {loading ? (
              <div className="flex flex-col items-center py-10">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mb-2" />
                <p className="text-[10px] font-black text-muted uppercase tracking-widest">Warming Up...</p>
              </div>
            ) : upcomingMatches.length === 0 ? (
              <div className="text-muted bg-card rounded-2xl p-10 text-center border-2 border-dashed border-border">
                <p className="text-sm font-bold uppercase tracking-tight">No matches scheduled.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Results */}
          {recentMatches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-xs font-black text-muted uppercase tracking-[0.2em]">History</h2>
                <div className="h-[1px] flex-1 bg-border mx-4" />
              </div>
              <div className="space-y-3 opacity-80">
                {recentMatches.slice(0, 3).map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "my-contests" ? (
        <div className="space-y-6">
          {/* Active Entries */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xs font-black text-muted uppercase tracking-[0.2em]">My Entries</h2>
              <div className="h-[1px] flex-1 bg-border mx-4" />
            </div>
            {loading ? (
              <div className="text-center py-10">
                <p className="text-xs font-bold text-muted animate-pulse">Fetching Field...</p>
              </div>
            ) : activeEntries.length === 0 ? (
              <div className="bg-card border-2 border-dashed border-border rounded-2xl p-10 text-center">
                <p className="text-sm font-bold text-muted uppercase tracking-tight mb-4">You&apos;re not on the field yet.</p>
                <button 
                  onClick={() => setActiveTab("matches")}
                  className="bg-primary text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest"
                >
                  Join Match
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeEntries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "my-teams" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xs font-black text-muted uppercase tracking-[0.2em]">Saved Strategies</h2>
            <div className="h-[1px] flex-1 bg-border mx-4" />
          </div>
          {loading ? (
            <div className="text-center py-10">
              <p className="text-xs font-bold text-muted animate-pulse">Syncing Teams...</p>
            </div>
          ) : myTeams.length === 0 ? (
            <div className="bg-card border-2 border-dashed border-border rounded-2xl p-10 text-center">
              <p className="text-sm font-bold text-muted uppercase tracking-tight">No teams saved yet.</p>
            </div>
          ) : (
            myTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === "LIVE";
  const isCompleted = match.status === "COMPLETED";
  const isUpcoming = match.status === "UPCOMING";
  const t1 = getTeamInfo(match.team1);
  const t2 = getTeamInfo(match.team2);

  return (
    <Link
      href={isCompleted ? `/contests?matchId=${match.id}` : `/matches/${match.id}`}
      className={`block bg-card border-2 rounded-2xl p-4 hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 group ${isLive ? "border-danger/30 ring-1 ring-danger/10" : "border-border"}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
              <img src={t1.logo} alt={t1.initials} className="w-full h-full object-contain" />
            </div>
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
              <img src={t2.logo} alt={t2.initials} className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="font-black text-lg group-hover:text-primary transition-colors">
            {t1.initials} <span className="text-muted text-xs font-bold mx-1">VS</span> {t2.initials}
          </div>
        </div>
        {isLive ? (
          <span className="bg-danger text-white text-[10px] font-black px-2 py-1 rounded uppercase animate-pulse">Live</span>
        ) : isUpcoming ? (
          <Countdown targetDate={match.date} className="text-primary text-xs" />
        ) : (
          <span className="text-[10px] font-black text-muted uppercase tracking-wider">Finished</span>
        )}
      </div>
      
      <div className="flex items-center justify-between text-[10px] font-bold text-muted uppercase tracking-tight bg-muted/20 rounded-lg px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-primary">{getRelativeDate(new Date(match.date))}</span>
          <div className="w-1 h-1 rounded-full bg-border" />
          <span>{match.venue}</span>
        </div>
        <div className="text-primary font-black">
          {match._count.contests} CONTESTS &rarr;
        </div>
      </div>
    </Link>
  );
}

function TeamCard({ team }: { team: SavedTeam }) {
  const t1 = getTeamInfo(team.match.team1);
  const t2 = getTeamInfo(team.match.team2);

  return (
    <Link
      href={`/teams/${team.id}`}
      className="block bg-card border-2 border-border rounded-2xl p-4 hover:border-primary/40 transition-all group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
              <img src={t1.logo} alt={t1.initials} className="w-full h-full object-contain" />
            </div>
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
              <img src={t2.logo} alt={t2.initials} className="w-full h-full object-contain" />
            </div>
          </div>
          <div>
            <div className="font-black text-sm group-hover:text-primary transition-colors">{team.teamName}</div>
            <div className="text-[10px] text-muted font-bold uppercase tracking-tight">{t1.initials} vs {t2.initials}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black text-primary uppercase tracking-wider">Edit Strategy &rarr;</div>
        </div>
      </div>
    </Link>
  );
}

function EntryCard({ entry }: { entry: ContestEntry }) {
  const t1 = getTeamInfo(entry.contest.match.team1);
  const t2 = getTeamInfo(entry.contest.match.team2);

  return (
    <Link
      href={`/contests/${entry.contest.id}`}
      className="block bg-card border-2 border-border rounded-2xl p-4 hover:border-primary/40 transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1">
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
              <img src={t1.logo} alt={t1.initials} className="w-full h-full object-contain" />
            </div>
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center ring-2 ring-card shadow-sm overflow-hidden p-0.5">
              <img src={t2.logo} alt={t2.initials} className="w-full h-full object-contain" />
            </div>
          </div>
          <div>
            <div className="font-black text-sm group-hover:text-primary transition-colors">{entry.contest.name}</div>
            <div className="text-[10px] text-muted font-bold uppercase tracking-tight">{t1.initials} vs {t2.initials}</div>
          </div>
        </div>
        <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded uppercase">{entry.contest.status}</span>
      </div>
      <div className="text-[10px] font-black text-muted uppercase tracking-wider bg-muted/20 px-3 py-1.5 rounded-lg flex justify-between items-center">
        <span>Team: {entry.teamName}</span>
        <span className="text-primary">Details &rarr;</span>
      </div>
    </Link>
  );
}
