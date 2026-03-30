"use client";

import { useEffect, useState } from "react";

interface LeaderboardEntry {
  username: string;
  totalContests: number;
  wins: number;
  top2: number;
  top3: number;
  totalPrize: number;
  totalPoints: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setLeaderboard(data.leaderboard || []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>

      {loading ? (
        <div className="text-muted">Loading...</div>
      ) : leaderboard.length === 0 ? (
        <div className="text-muted bg-card rounded-xl p-6 text-center">
          No completed contests yet. Play some matches!
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, i) => (
            <div
              key={entry.username}
              className="bg-card rounded-lg p-4 border border-border flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0
                      ? "bg-primary/20 text-primary"
                      : i === 1
                      ? "bg-muted/30 text-foreground"
                      : i === 2
                      ? "bg-primary/10 text-primary/70"
                      : "bg-background text-muted"
                  }`}
                >
                  {i + 1}
                </span>
                <div>
                  <div className="font-medium">@{entry.username}</div>
                  <div className="text-xs text-muted">
                    {entry.totalContests} contests played
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex gap-3 text-xs mb-1">
                  <span className="text-primary font-semibold">
                    {entry.wins} win{entry.wins !== 1 ? "s" : ""}
                  </span>
                  <span className="text-muted">
                    #{" "}2: {entry.top2} | #3: {entry.top3}
                  </span>
                </div>
                <div className="text-sm text-success font-semibold">
                  {entry.totalPrize.toFixed(0)} vINR earned
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
