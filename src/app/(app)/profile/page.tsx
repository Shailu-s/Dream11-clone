"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

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

export default function ProfilePage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then(() => {
        // Fetch user's contest entries
        fetch("/api/contests/my-entries")
          .then((r) => r.json())
          .then((data) => {
            setEntries(data.entries || []);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, []);

  return (
    <div>
      <div className="bg-card rounded-xl p-6 border border-border mb-6">
        <h1 className="text-2xl font-bold mb-1">@{user?.username}</h1>
        <p className="text-muted text-sm mb-4">{user?.email}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-background rounded-lg p-3 text-center">
            <div className="text-xs text-muted">Balance</div>
            <div className="font-bold text-primary text-lg">
              {user?.tokenBalance.toLocaleString()} vINR
            </div>
          </div>
          <div className="bg-background rounded-lg p-3 text-center">
            <div className="text-xs text-muted">Contests</div>
            <div className="font-bold text-lg">{entries.length}</div>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Contest History</h2>

      {loading ? (
        <div className="text-muted">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-muted bg-card rounded-xl p-6 text-center">
          No contests played yet
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <a
              key={entry.id}
              href={`/contests/${entry.contest.id}`}
              className="block bg-card rounded-lg p-3 border border-border hover:bg-card-hover transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{entry.contest.name}</div>
                  <div className="text-xs text-muted">
                    {entry.contest.match.team1} vs {entry.contest.match.team2}
                  </div>
                  <div className="text-xs text-muted">{entry.teamName}</div>
                </div>
                <div className="text-right">
                  {entry.rank && (
                    <div className="text-sm font-semibold">
                      #{entry.rank}
                    </div>
                  )}
                  <div className="text-xs text-muted">
                    {entry.totalPoints.toFixed(1)} pts
                  </div>
                  {entry.prizeWon > 0 && (
                    <div className="text-xs text-success font-semibold">
                      +{entry.prizeWon.toFixed(0)} vINR
                    </div>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
