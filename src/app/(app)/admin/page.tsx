"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

interface UserRow {
  id: string;
  email: string;
  username: string;
  role: string;
  tokenBalance: number;
  createdAt: string;
  _count: { contestEntries: number };
}

interface TransactionRow {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
  adminNote: string | null;
  buyerName: string | null;
  upiTransactionId: string | null;
  user: {
    username: string;
    email: string;
    tokenBalance: number;
  };
}

interface MatchRow {
  id: string;
  team1: string;
  team2: string;
  date: string;
  venue: string;
  status: "UPCOMING" | "LIVE" | "COMPLETED";
  _count: { contests: number };
}

interface PlayerRow {
  id: string;
  name: string;
  team: string;
  role: string;
  creditPrice: number;
  isInPlayingXI?: boolean;
}

interface PlayerStatForm {
  playerId: string;
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
  lbwBowled: number;
  didBat: boolean;
  isOut: boolean;
}

const EMPTY_STAT = {
  runs: 0,
  ballsFaced: 0,
  fours: 0,
  sixes: 0,
  wickets: 0,
  oversBowled: 0,
  maidens: 0,
  runsConceded: 0,
  catches: 0,
  stumpings: 0,
  runOutsDirect: 0,
  runOutsIndirect: 0,
  lbwBowled: 0,
  didBat: false,
  isOut: false,
};

type AdminTab = "tokens" | "scoring" | "matches" | "users" | "playing-xi";

export default function AdminPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStatForm>>({});
  const [playingXI, setPlayingXI] = useState<Record<string, boolean>>({});
  const [selectedMatchId, setSelectedMatchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("tokens");
  const [matchFilter, setMatchFilter] = useState<"ALL" | "UPCOMING" | "LIVE" | "COMPLETED">("UPCOMING");
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [cronStatus, setCronStatus] = useState<{
    lastRanAt: string | null;
    matchName: string | null;
    statsCount: number | null;
    matchEnded: boolean;
    error: string | null;
    requestsUsedToday: number | null;
  } | null>(null);

  async function fetchAdminData() {
    const [usersRes, txRes, matchesRes] = await Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/admin/tokens"),
      fetch("/api/matches"),
    ]);

    const [usersData, txData, matchesData] = await Promise.all([
      usersRes.json(),
      txRes.json(),
      matchesRes.json(),
    ]);

    return {
      users: usersData.users || [],
      transactions: txData.transactions || [],
      matches: matchesData.matches || [],
    };
  }

  async function loadCronStatus() {
    try {
      const res = await fetch("/api/admin/cron-status");
      if (res.ok) {
        const data = await res.json();
        setCronStatus(data);
      }
    } catch {
      // non-critical, ignore
    }
  }

  async function loadAdminData() {
    const data = await fetchAdminData();
    setUsers(data.users);
    setTransactions(data.transactions);
    setMatches(data.matches);
    setLoading(false);

    if (!selectedMatchId && data.matches.length > 0) {
      // Default to first LIVE or UPCOMING match for scoring
      const liveMatch = data.matches.find((m: MatchRow) => m.status === "LIVE");
      const upcomingMatch = data.matches.find((m: MatchRow) => m.status === "UPCOMING");
      setSelectedMatchId(liveMatch?.id || upcomingMatch?.id || data.matches[0].id);
    }
    await loadCronStatus();
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      const data = await fetchAdminData();
      if (!active) return;

      setUsers(data.users);
      setTransactions(data.transactions);
      setMatches(data.matches);
      setLoading(false);

      if (data.matches.length > 0) {
        setSelectedMatchId((current) => {
          if (current) return current;
          const liveMatch = data.matches.find((m: MatchRow) => m.status === "LIVE");
          const upcomingMatch = data.matches.find((m: MatchRow) => m.status === "UPCOMING");
          return liveMatch?.id || upcomingMatch?.id || data.matches[0].id;
        });
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedMatchId) return;

    let active = true;

    async function loadScoringData() {
      setScoringLoading(true);

      const [playersRes, statsRes] = await Promise.all([
        fetch(`/api/players?matchId=${selectedMatchId}`),
        fetch(`/api/admin/scoring?matchId=${selectedMatchId}`),
      ]);

      const [playersData, statsData] = await Promise.all([
        playersRes.json(),
        statsRes.json(),
      ]);

      if (!active) return;

      const nextPlayers = (playersData.players || []) as PlayerRow[];
      const nextStats: Record<string, PlayerStatForm> = {};

      for (const player of nextPlayers) {
        nextStats[player.id] = {
          playerId: player.id,
          ...EMPTY_STAT,
        };
      }

      for (const stat of statsData.stats || []) {
        nextStats[stat.playerId] = {
          playerId: stat.playerId,
          runs: stat.runs ?? 0,
          ballsFaced: stat.ballsFaced ?? 0,
          fours: stat.fours ?? 0,
          sixes: stat.sixes ?? 0,
          wickets: stat.wickets ?? 0,
          oversBowled: stat.oversBowled ?? 0,
          maidens: stat.maidens ?? 0,
          runsConceded: stat.runsConceded ?? 0,
          catches: stat.catches ?? 0,
          stumpings: stat.stumpings ?? 0,
          runOutsDirect: stat.runOutsDirect ?? 0,
          runOutsIndirect: stat.runOutsIndirect ?? 0,
          lbwBowled: stat.lbwBowled ?? 0,
          didBat: Boolean(stat.didBat),
          isOut: Boolean(stat.isOut),
        };
      }

      setPlayers(nextPlayers);
      setPlayerStats(nextStats);

      // Initialize playing XI state from fetched players
      const nextPlayingXI: Record<string, boolean> = {};
      for (const p of nextPlayers) {
        nextPlayingXI[p.id] = p.isInPlayingXI ?? false;
      }
      setPlayingXI(nextPlayingXI);

      setScoringLoading(false);
    }

    void loadScoringData();

    return () => {
      active = false;
    };
  }, [selectedMatchId]);

  async function handleTransactionAction(
    transactionId: string,
    action: "APPROVED" | "REJECTED"
  ) {
    setSubmittingId(transactionId);
    setMessage("");

    const res = await fetch("/api/admin/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId, action }),
    });

    const data = await res.json();
    setSubmittingId(null);

    if (!res.ok) {
      setMessage(data.error || "Failed to update transaction");
      return;
    }

    setMessage(data.message || "Transaction updated");
    await loadAdminData();
  }

  async function handleMatchStatus(matchId: string, status: MatchRow["status"]) {
    setSubmittingId(matchId);
    setMessage("");

    const res = await fetch("/api/admin/matches", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, status }),
    });

    const data = await res.json();
    setSubmittingId(null);

    if (!res.ok) {
      setMessage(data.error || "Failed to update match");
      return;
    }

    setMessage(`Match moved to ${status}`);
    await loadAdminData();
  }

  function updateNumberStat(playerId: string, field: keyof PlayerStatForm, value: string) {
    const parsed = value === "" ? 0 : Number(value);
    setPlayerStats((current) => ({
      ...current,
      [playerId]: {
        ...current[playerId],
        [field]: Number.isFinite(parsed) ? parsed : 0,
      },
    }));
  }

  function updateBooleanStat(playerId: string, field: keyof PlayerStatForm, checked: boolean) {
    setPlayerStats((current) => ({
      ...current,
      [playerId]: {
        ...current[playerId],
        [field]: checked,
      },
    }));
  }

  async function handleSaveStats() {
    if (!selectedMatchId) return;

    setSubmittingId(`save-${selectedMatchId}`);
    setMessage("");

    const payload = players.map((player) => playerStats[player.id]);
    const res = await fetch("/api/admin/scoring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: selectedMatchId, playerStats: payload }),
    });

    const data = await res.json();
    setSubmittingId(null);

    if (!res.ok) {
      setMessage(data.error || "Failed to save stats");
      return;
    }

    setMessage(data.message || "Stats saved");
  }

  async function handleSavePlayingXI() {
    if (!selectedMatchId) return;

    setSubmittingId(`playing-xi-${selectedMatchId}`);
    setMessage("");

    const payload = Object.entries(playingXI).map(([playerId, isInPlayingXI]) => ({
      playerId,
      isInPlayingXI,
    }));

    const res = await fetch("/api/admin/matches/playing-xi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: selectedMatchId, playingXIs: payload }),
    });

    const data = await res.json();
    setSubmittingId(null);

    if (!res.ok) {
      setMessage(data.error || "Failed to save playing XI");
      return;
    }

    setMessage(data.message || "Playing XI updated");
  }

  async function handleFetchApi() {
    if (!selectedMatchId) return;

    setIsFetchingApi(true);
    setMessage("");

    try {
      const res = await fetch(`/api/admin/scoring/fetch-api?matchId=${selectedMatchId}`);
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to fetch API stats");
        return;
      }

      setPlayerStats((current) => {
        const next = { ...current };
        for (const stat of data.playerStats) {
          if (next[stat.playerId]) {
            next[stat.playerId] = { ...next[stat.playerId], ...stat };
          }
        }
        return next;
      });

      setMessage(`Fetched stats from API: ${data.matchName} (${data.status})`);
    } catch (err) {
      console.error(err);
      setMessage("An error occurred while fetching API stats");
    } finally {
      setIsFetchingApi(false);
    }
  }

  async function handleFinalizeScoring() {
    if (!selectedMatchId) return;
    setShowFinalizeModal(true);
  }

  async function confirmFinalizeScoring() {
    if (!selectedMatchId) return;
    setShowFinalizeModal(false);
    setSubmittingId(`finalize-${selectedMatchId}`);
    setMessage("");

    const res = await fetch("/api/admin/scoring", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: selectedMatchId }),
    });

    const data = await res.json();
    setSubmittingId(null);

    if (!res.ok) {
      setMessage(data.error || "Failed to finalize scoring");
      return;
    }

    setMessage(data.message || "Scoring complete");
    await loadAdminData();
  }

  if (loading) {
    return <div className="text-muted">Loading admin data...</div>;
  }

  const selectedMatch = matches.find((match) => match.id === selectedMatchId) || null;
  const filteredMatches = matchFilter === "ALL"
    ? matches
    : matches.filter((m) => m.status === matchFilter);

  // Only show LIVE and recent matches in the scoring dropdown
  const scoringMatches = matches.filter(
    (m) => m.status === "LIVE" || m.status === "COMPLETED" || m.status === "UPCOMING"
  );

  const tabs: { key: AdminTab; label: string; count?: number }[] = [
    { key: "tokens", label: "vINR Requests", count: transactions.length },
    { key: "playing-xi", label: "Playing XI" },
    { key: "scoring", label: "Scoring" },
    { key: "matches", label: "Matches" },
    { key: "users", label: "Users", count: users.length },
  ];

  if (authLoading) return null;

  if (!authUser || authUser.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-danger mb-2">Bro, Don&apos;t Fuck Around</h1>
        <p className="text-muted">This area is admin only. You don&apos;t belong here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Console</h1>
        {message && (
          <div className="mt-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2 text-sm text-primary">
            {message}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-card rounded-lg p-1 border border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1 text-xs ${
                activeTab === tab.key ? "opacity-80" : "text-primary"
              }`}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tokens Tab */}
      {activeTab === "tokens" && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pending Token Requests</h2>
            <span className="text-sm text-muted">{transactions.length} pending</span>
          </div>

          {transactions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted">
              No pending requests.
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold">
                        @{tx.user.username} &middot;{" "}
                        <span className={tx.type === "BUY_REQUEST" ? "text-success" : "text-danger"}>
                          {tx.type === "BUY_REQUEST" ? "BUY" : "SELL"}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-muted">
                        {tx.amount} vINR &middot; {tx.user.email} &middot; balance {tx.user.tokenBalance}
                      </div>
                      {tx.buyerName && (
                        <div className="mt-1 text-xs text-foreground">
                          Name: <span className="font-medium">{tx.buyerName}</span>
                          {tx.upiTransactionId && (
                            <span className="ml-2 text-muted">· UPI: <span className="font-mono">{tx.upiTransactionId}</span></span>
                          )}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted">
                        {new Date(tx.createdAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTransactionAction(tx.id, "APPROVED")}
                        disabled={submittingId === tx.id}
                        className="rounded-lg bg-success px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleTransactionAction(tx.id, "REJECTED")}
                        disabled={submittingId === tx.id}
                        className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Playing XI Tab */}
      {activeTab === "playing-xi" && (
        <section className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="mb-2 block text-sm text-muted">Select Match</label>
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {matches.filter(m => m.status !== "COMPLETED").map((match) => (
                <option key={match.id} value={match.id}>
                  {match.team1} vs {match.team2} &middot; {match.status} &middot;{" "}
                  {new Date(match.date).toLocaleDateString("en-IN")}
                </option>
              ))}
            </select>
          </div>

          {scoringLoading ? (
            <div className="text-sm text-muted">Loading squad...</div>
          ) : (() => {
            const ROLE_ORDER = ["WK", "BAT", "AR", "BOWL"];
            const ROLE_LABEL: Record<string, string> = { WK: "Wicket-Keepers", BAT: "Batters", AR: "All-Rounders", BOWL: "Bowlers" };

            const team1 = selectedMatch?.team1;
            const team2 = selectedMatch?.team2;
            const t1Count = players.filter(p => p.team === team1 && playingXI[p.id]).length;
            const t2Count = players.filter(p => p.team === team2 && playingXI[p.id]).length;
            const bothReady = t1Count === 11 && t2Count === 11;

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[team1, team2].map((teamName) => {
                    if (!teamName) return null;
                    const teamPlayers = players.filter(p => p.team === teamName);
                    const count = teamPlayers.filter(p => playingXI[p.id]).length;
                    const full = count === 11;

                    return (
                      <div key={teamName} className="rounded-xl border border-border bg-card overflow-hidden">
                        {/* Team header */}
                        <div className={`px-4 py-2.5 border-b border-border flex justify-between items-center ${full ? "bg-success/10" : "bg-background"}`}>
                          <span className="font-bold text-sm">{teamName}</span>
                          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                            full ? "bg-success text-white" : count > 11 ? "bg-danger text-white" : "bg-muted/30 text-muted"
                          }`}>
                            {count}/11
                          </span>
                        </div>

                        {/* Players grouped by role */}
                        <div className="p-2 space-y-3">
                          {ROLE_ORDER.map((role) => {
                            const rolePlayers = teamPlayers
                              .filter(p => p.role === role)
                              .sort((a, b) => b.creditPrice - a.creditPrice);
                            if (rolePlayers.length === 0) return null;
                            const roleSelected = rolePlayers.filter(p => playingXI[p.id]).length;

                            return (
                              <div key={role}>
                                <div className="flex items-center gap-2 px-2 mb-1">
                                  <span className="text-[10px] font-black text-muted uppercase tracking-widest">{ROLE_LABEL[role]}</span>
                                  {roleSelected > 0 && (
                                    <span className="text-[10px] font-black text-primary">{roleSelected}</span>
                                  )}
                                </div>
                                <div className="space-y-0.5">
                                  {rolePlayers.map(player => {
                                    const checked = playingXI[player.id] || false;
                                    const disabled = !checked && count >= 11;
                                    return (
                                      <label
                                        key={player.id}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                                          checked
                                            ? "bg-primary/10 border border-primary/30"
                                            : disabled
                                            ? "opacity-40 cursor-not-allowed border border-transparent"
                                            : "hover:bg-background cursor-pointer border border-transparent"
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={disabled}
                                            onChange={(e) => setPlayingXI(prev => ({ ...prev, [player.id]: e.target.checked }))}
                                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed"
                                          />
                                          <div>
                                            <div className="text-sm font-semibold">{player.name}</div>
                                            <div className="text-[10px] text-muted font-bold">{player.creditPrice} Cr</div>
                                          </div>
                                        </div>
                                        {checked && (
                                          <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.7)]" />
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Save button — only active when both teams have exactly 11 */}
                <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
                  <div className="text-sm text-muted">
                    {bothReady
                      ? <span className="text-success font-bold">Both teams ready — 11/11 each</span>
                      : <span>Select exactly 11 players per team to save ({team1}: {t1Count}/11 · {team2}: {t2Count}/11)</span>
                    }
                  </div>
                  <button
                    onClick={handleSavePlayingXI}
                    disabled={!bothReady || submittingId === `playing-xi-${selectedMatchId}`}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-40 whitespace-nowrap"
                  >
                    {submittingId === `playing-xi-${selectedMatchId}` ? "Saving..." : "Save Playing XI"}
                  </button>
                </div>
              </>
            );
          })()}
        </section>
      )}

      {/* Scoring Tab */}
      {activeTab === "scoring" && (
        <section className="space-y-4">

          {/* Cron Status Banner */}
          {cronStatus && (
            <div className={`rounded-xl border p-3 text-xs space-y-1 ${cronStatus.error ? "border-red-400/40 bg-red-500/10" : "border-border bg-card"}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-muted uppercase tracking-wider">Auto-Fetch Status</span>
                <button onClick={loadCronStatus} className="text-primary hover:underline text-[10px]">Refresh</button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
                <span>Last run: <span className="text-foreground font-semibold">{cronStatus.lastRanAt ? new Date(cronStatus.lastRanAt).toLocaleString("en-IN") : "Never"}</span></span>
                {cronStatus.matchName && <span>Match: <span className="text-foreground font-semibold">{cronStatus.matchName}</span></span>}
                {cronStatus.statsCount !== null && <span>Players saved: <span className="text-foreground font-semibold">{cronStatus.statsCount}</span></span>}
                {cronStatus.matchEnded && <span className="text-orange-400 font-bold">Match ended — ready to finalize</span>}
                <span>API hits today: <span className={`font-semibold ${(cronStatus.requestsUsedToday ?? 0) >= 250 ? "text-red-400" : (cronStatus.requestsUsedToday ?? 0) >= 200 ? "text-yellow-400" : "text-green-400"}`}>{cronStatus.requestsUsedToday ?? 0}/270</span></span>
              </div>
              {cronStatus.error && <div className="text-red-400 font-semibold">Error: {cronStatus.error}</div>}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-4">
            <label className="mb-2 block text-sm text-muted">Select Match</label>
            <select
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {scoringMatches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.team1} vs {match.team2} &middot; {match.status} &middot;{" "}
                  {new Date(match.date).toLocaleDateString("en-IN")}
                </option>
              ))}
            </select>

            {selectedMatch && (
              <div className="mt-3 text-sm text-muted">
                {new Date(selectedMatch.date).toLocaleString("en-IN")} &middot; {selectedMatch.venue}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleFetchApi()}
                disabled={scoringLoading || isFetchingApi || players.length === 0}
                className="rounded-lg bg-primary/20 border border-primary/30 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
              >
                {isFetchingApi ? "Fetching..." : "Fetch from API"}
              </button>

              <button
                onClick={handleSaveStats}
                disabled={scoringLoading || isFetchingApi || players.length === 0 || submittingId === `save-${selectedMatchId}`}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submittingId === `save-${selectedMatchId}` ? "Saving..." : "Save Stats"}
              </button>
              <button
                onClick={handleFinalizeScoring}
                disabled={scoringLoading || isFetchingApi || players.length === 0 || submittingId === `finalize-${selectedMatchId}`}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submittingId === `finalize-${selectedMatchId}` ? "Finalizing..." : "Finalize & Distribute Prizes"}
              </button>
            </div>
          </div>

          {scoringLoading ? (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted">
              Loading player stats...
            </div>
          ) : players.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted">
              No players available for this match.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-[1400px] bg-card text-sm">
                <thead className="bg-background text-left text-muted">
                  <tr>
                    <th className="px-3 py-3 font-medium">Player</th>
                    <th className="px-3 py-3 font-medium">Bat</th>
                    <th className="px-3 py-3 font-medium">Out</th>
                    <th className="px-3 py-3 font-medium">R</th>
                    <th className="px-3 py-3 font-medium">B</th>
                    <th className="px-3 py-3 font-medium">4s</th>
                    <th className="px-3 py-3 font-medium">6s</th>
                    <th className="px-3 py-3 font-medium">Wkts</th>
                    <th className="px-3 py-3 font-medium">Overs</th>
                    <th className="px-3 py-3 font-medium">Mdns</th>
                    <th className="px-3 py-3 font-medium">RC</th>
                    <th className="px-3 py-3 font-medium">Ct</th>
                    <th className="px-3 py-3 font-medium">St</th>
                    <th className="px-3 py-3 font-medium">RO-D</th>
                    <th className="px-3 py-3 font-medium">RO-I</th>
                    <th className="px-3 py-3 font-medium">LBW/B</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => {
                    const stat = playerStats[player.id] || {
                      playerId: player.id,
                      ...EMPTY_STAT,
                    };

                    return (
                      <tr key={player.id} className="border-t border-border">
                        <td className="px-3 py-3">
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-muted">
                            {player.team} &middot; {player.role} &middot; {player.creditPrice} Cr
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={stat.didBat}
                            onChange={(e) =>
                              updateBooleanStat(player.id, "didBat", e.target.checked)
                            }
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={stat.isOut}
                            onChange={(e) =>
                              updateBooleanStat(player.id, "isOut", e.target.checked)
                            }
                          />
                        </td>
                        {(["runs", "ballsFaced", "fours", "sixes", "wickets"] as const).map((field) => (
                          <td key={field} className="px-3 py-3">
                            <input
                              type="number"
                              value={stat[field]}
                              min={0}
                              onChange={(e) => updateNumberStat(player.id, field, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              className="w-16 rounded border border-border bg-background px-2 py-1"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            step="0.1"
                            value={stat.oversBowled}
                            min={0}
                            onChange={(e) =>
                              updateNumberStat(player.id, "oversBowled", e.target.value)
                            }
                            onFocus={(e) => e.target.select()}
                            className="w-20 rounded border border-border bg-background px-2 py-1"
                          />
                        </td>
                        {(["maidens", "runsConceded", "catches", "stumpings", "runOutsDirect", "runOutsIndirect", "lbwBowled"] as const).map((field) => (
                          <td key={field} className="px-3 py-3">
                            <input
                              type="number"
                              value={stat[field]}
                              min={0}
                              onChange={(e) => updateNumberStat(player.id, field, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              className="w-16 rounded border border-border bg-background px-2 py-1"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Matches Tab */}
      {activeTab === "matches" && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Matches</h2>
            <span className="text-sm text-muted">{filteredMatches.length} shown</span>
          </div>

          <div className="flex gap-2 mb-4">
            {(["ALL", "UPCOMING", "LIVE", "COMPLETED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setMatchFilter(status)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  matchFilter === status
                    ? "bg-primary/20 text-primary"
                    : "bg-card text-muted hover:text-foreground"
                }`}
              >
                {status} ({status === "ALL" ? matches.length : matches.filter((m) => m.status === status).length})
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filteredMatches.map((match) => (
              <div
                key={match.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold">
                      {match.team1} vs {match.team2}
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      {new Date(match.date).toLocaleString("en-IN")} &middot; {match.venue}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        match.status === "LIVE"
                          ? "bg-danger/20 text-danger"
                          : match.status === "UPCOMING"
                          ? "bg-success/20 text-success"
                          : "bg-muted/20 text-muted"
                      }`}>
                        {match.status}
                      </span>
                      {match._count.contests > 0 && (
                        <span className="text-xs text-muted">
                          {match._count.contests} contest{match._count.contests !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["UPCOMING", "LIVE", "COMPLETED"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleMatchStatus(match.id, status)}
                        disabled={submittingId === match.id || match.status === status}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-30 ${
                          match.status === status
                            ? "bg-primary text-white"
                            : "bg-background text-foreground hover:bg-card-hover border border-border"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Users</h2>
            <span className="text-sm text-muted">{users.length} registered</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full bg-card text-sm">
              <thead className="bg-background text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Entries</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">@{user.username}</div>
                      <div className="text-xs text-muted">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        user.role === "ADMIN" ? "bg-primary/20 text-primary" : "bg-muted/20 text-muted"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{user.tokenBalance}</td>
                    <td className="px-4 py-3">{user._count.contestEntries}</td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(user.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Finalize Scoring Modal */}
      {showFinalizeModal && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="text-center">
              <div className="text-3xl mb-2">🏆</div>
              <h2 className="text-lg font-bold">Finalize & Distribute Prizes</h2>
              <p className="text-sm text-muted mt-1 font-semibold">
                {selectedMatch.team1} vs {selectedMatch.team2}
              </p>
              {selectedMatch._count.contests > 0 && (
                <p className="text-xs text-muted mt-1">
                  {selectedMatch._count.contests} contest{selectedMatch._count.contests !== 1 ? "s" : ""} will be closed
                </p>
              )}
            </div>

            <div className="bg-background rounded-xl border border-border p-3 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-foreground">
                <span className="text-success">✓</span> Fantasy points calculated from saved stats
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <span className="text-success">✓</span> Contest leaderboards ranked
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <span className="text-success">✓</span> Prize vINR credited to winners automatically
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <span className="text-success">✓</span> All contests marked as Completed
              </div>
            </div>

            <div className="bg-danger/10 border border-danger/20 rounded-lg px-3 py-2 text-xs text-danger font-semibold text-center">
              ⚠ This cannot be undone. Confirm all stats are saved.
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold hover:bg-card-hover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmFinalizeScoring}
                className="flex-1 rounded-lg bg-primary text-white py-2.5 text-sm font-semibold hover:bg-primary-hover transition-colors"
              >
                Yes, Finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
