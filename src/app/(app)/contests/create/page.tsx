"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/utils";

interface Match {
  id: string;
  team1: string;
  team2: string;
  date: string;
  venue: string;
}

interface PrizeDist {
  rank: number;
  percentage: number;
}

const PRESETS: { label: string; dist: PrizeDist[] }[] = [
  {
    label: "Top 3 (50/30/20)",
    dist: [
      { rank: 1, percentage: 50 },
      { rank: 2, percentage: 30 },
      { rank: 3, percentage: 20 },
    ],
  },
  {
    label: "Winner Takes All",
    dist: [{ rank: 1, percentage: 100 }],
  },
  {
    label: "Top 2 (60/40)",
    dist: [
      { rank: 1, percentage: 60 },
      { rank: 2, percentage: 40 },
    ],
  },
  {
    label: "Top 5 (40/25/15/12/8)",
    dist: [
      { rank: 1, percentage: 40 },
      { rank: 2, percentage: 25 },
      { rank: 3, percentage: 15 },
      { rank: 4, percentage: 12 },
      { rank: 5, percentage: 8 },
    ],
  },
];

export default function CreateContestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedMatchId = searchParams.get("matchId");

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchId, setMatchId] = useState(preselectedMatchId || "");
  const [name, setName] = useState("");
  const [entryFee, setEntryFee] = useState(20);
  const [prizeDistribution, setPrizeDistribution] = useState<PrizeDist[]>(
    PRESETS[0].dist
  );
  const [maxParticipants, setMaxParticipants] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/matches?status=UPCOMING")
      .then((r) => r.json())
      .then((data) => setMatches(data.matches || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/contests/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId,
        name,
        entryFee,
        prizeDistribution,
        maxParticipants: maxParticipants || undefined,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push(`/contests/${data.contest.id}`);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create Contest</h1>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        <div>
          <label className="block text-sm text-muted mb-1.5">Select Match</label>
          <select
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            required
          >
            <option value="">Choose a match...</option>
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.team1} vs {m.team2} — {formatDate(new Date(m.date))}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">Contest Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Friends League"
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">
            Entry Fee (vINR)
          </label>
          <input
            type="number"
            value={entryFee}
            onChange={(e) => setEntryFee(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            min={0}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">
            Max Participants (optional)
          </label>
          <input
            type="number"
            value={maxParticipants}
            onChange={(e) =>
              setMaxParticipants(e.target.value ? Number(e.target.value) : "")
            }
            min={2}
            placeholder="Unlimited"
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm text-muted mb-1.5">
            Prize Distribution
          </label>
          {maxParticipants !== "" && prizeDistribution.length > Number(maxParticipants) && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-xs rounded-lg px-3 py-2 mb-2">
              Warning: {prizeDistribution.length} prize ranks but max {maxParticipants} participants. Lower ranks may not be filled — unclaimed prizes go to rank 1.
            </div>
          )}
          {(maxParticipants === "" || prizeDistribution.length > 1) && (
            <p className="text-xs text-muted mb-2">
              If fewer participants than prize ranks, unclaimed percentages go to rank 1.
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setPrizeDistribution(preset.dist)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  JSON.stringify(prizeDistribution) === JSON.stringify(preset.dist)
                    ? "bg-primary/20 border-primary text-primary"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="bg-card border border-border rounded-lg p-3 space-y-2">
            {prizeDistribution.map((pd, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-muted w-16">Rank #{pd.rank}</span>
                <input
                  type="number"
                  value={pd.percentage}
                  onChange={(e) => {
                    const updated = [...prizeDistribution];
                    updated[i] = { ...pd, percentage: Number(e.target.value) };
                    setPrizeDistribution(updated);
                  }}
                  onFocus={(e) => e.target.select()}
                  min={1}
                  max={100}
                  className="w-20 bg-background border border-border rounded px-2 py-1 text-sm"
                />
                <span className="text-muted">%</span>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white font-semibold rounded-lg py-2.5 hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating..." : "Create Contest"}
        </button>
      </form>
    </div>
  );
}
