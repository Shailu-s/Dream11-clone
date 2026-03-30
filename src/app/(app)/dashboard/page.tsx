"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { formatDate, getRelativeDate } from "@/lib/utils";

interface Match {
  id: string;
  team1: string;
  team2: string;
  date: string;
  venue: string;
  status: string;
  _count: { contests: number };
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"matches" | "my-contests">("matches");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [upcomingRes, liveRes, recentRes, entriesRes] = await Promise.all([
          fetch("/api/matches?status=UPCOMING"),
          fetch("/api/matches?status=LIVE"),
          fetch("/api/matches?status=COMPLETED"),
          fetch("/api/contests/my-entries"),
        ]);

        const upcomingData = await upcomingRes.json();
        const liveData = await liveRes.json();
        const recentData = await recentRes.json();
        const entriesData = await entriesRes.json();

        setUpcomingMatches(upcomingData.matches || []);
        setLiveMatches(liveData.matches || []);
        setRecentMatches(recentData.matches || []);
        setMyEntries(entriesData.entries || []);
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
    <div className="pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Welcome, <span className="text-primary">{user?.username}</span>
        </h1>
        <p className="text-muted text-sm mt-1">
          {user?.tokenBalance.toLocaleString()} Tokens Available
        </p>
      </div>

      <div className="flex gap-4 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab("matches")}
          className={`pb-2 text-sm font-semibold transition-colors relative ${
            activeTab === "matches" ? "text-primary" : "text-muted hover:text-foreground"
          }`}
        >
          Matches
          {activeTab === "matches" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("my-contests")}
          className={`pb-2 text-sm font-semibold transition-colors relative ${
            activeTab === "my-contests" ? "text-primary" : "text-muted hover:text-foreground"
          }`}
        >
          My Contests
          {activeEntries.length > 0 && (
            <span className="ml-1.5 bg-primary text-background text-[10px] px-1.5 py-0.5 rounded-full">
              {activeEntries.length}
            </span>
          )}
          {activeTab === "my-contests" && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {activeTab === "matches" ? (
        <div className="space-y-8">
          {/* Live Matches */}
          {liveMatches.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                <h2 className="text-lg font-semibold">Live Matches</h2>
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
            <h2 className="text-lg font-semibold mb-3">Upcoming Matches</h2>
            {loading ? (
              <div className="text-muted text-sm">Loading matches...</div>
            ) : upcomingMatches.length === 0 ? (
              <div className="text-muted bg-card rounded-xl p-6 text-center text-sm border border-border border-dashed">
                No upcoming matches
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMatches.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Results */}
          {recentMatches.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted">Recent Results</h2>
              <div className="space-y-3 opacity-80">
                {recentMatches.slice(0, 3).map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Entries */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Active Contests</h2>
            {loading ? (
              <div className="text-muted text-sm">Loading your entries...</div>
            ) : activeEntries.length === 0 ? (
              <div className="text-muted bg-card rounded-xl p-6 text-center text-sm border border-border border-dashed">
                You haven&apos;t joined any active contests.
                <button 
                  onClick={() => setActiveTab("matches")}
                  className="block mx-auto mt-2 text-primary font-semibold hover:underline"
                >
                  Browse Matches
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

          {/* Past Entries */}
          {myEntries.some((e) => e.contest.status === "COMPLETED") && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted">Past Contests</h2>
              <div className="space-y-3">
                {myEntries
                  .filter((e) => e.contest.status === "COMPLETED")
                  .slice(0, 5)
                  .map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
              </div>
              <Link 
                href="/profile" 
                className="block text-center text-sm text-primary font-medium mt-4 hover:underline"
              >
                View Full History &rarr;
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === "LIVE";
  const isCompleted = match.status === "COMPLETED";

  return (
    <Link
      href={isCompleted ? `/contests?matchId=${match.id}` : `/contests/create?matchId=${match.id}`}
      className="block bg-card rounded-xl p-4 hover:bg-card-hover transition-colors border border-border group"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-lg">
            {match.team1} <span className="text-muted font-normal text-sm mx-1">vs</span> {match.team2}
          </div>
          <div className="text-xs text-muted mt-1">
            <span className="text-primary font-semibold mr-2">{getRelativeDate(new Date(match.date))}</span>
            {formatDate(new Date(match.date))} &middot; {match.venue}
          </div>
        </div>
        <div className="text-right">
          {isLive ? (
            <span className="text-[10px] font-bold bg-danger/10 text-danger px-2 py-0.5 rounded-full uppercase tracking-wider">
              Live
            </span>
          ) : isCompleted ? (
            <span className="text-[10px] font-bold bg-muted/20 text-muted px-2 py-0.5 rounded-full uppercase tracking-wider">
              Completed
            </span>
          ) : (
            <div className="text-xs text-muted">
              {match._count.contests} contest{match._count.contests !== 1 ? "s" : ""}
            </div>
          )}
          <div className="text-xs text-primary mt-1 font-semibold group-hover:translate-x-1 transition-transform">
            {isCompleted ? "Results" : "Play Now"} &rarr;
          </div>
        </div>
      </div>
    </Link>
  );
}

function EntryCard({ entry }: { entry: ContestEntry }) {
  const isCompleted = entry.contest.status === "COMPLETED";

  return (
    <Link
      href={`/contests/${entry.contest.id}`}
      className="block bg-card rounded-xl p-4 hover:bg-card-hover transition-colors border border-border"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm">{entry.contest.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
              isCompleted ? "bg-muted/20 text-muted" : "bg-primary/20 text-primary"
            }`}>
              {entry.contest.status}
            </span>
          </div>
          <div className="text-xs text-muted">
            {entry.contest.match.team1} vs {entry.contest.match.team2} &middot; {entry.teamName}
          </div>
        </div>
        <div className="text-right">
          {isCompleted ? (
            <>
              {entry.rank && (
                <div className="text-sm font-bold text-foreground">
                  Rank #{entry.rank}
                </div>
              )}
              {entry.prizeWon > 0 ? (
                <div className="text-xs text-success font-bold">
                  +{entry.prizeWon} vINR
                </div>
              ) : (
                <div className="text-xs text-muted">
                  {entry.totalPoints.toFixed(1)} pts
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-primary font-semibold">
              View Team &rarr;
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
