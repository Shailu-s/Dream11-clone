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

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

type Tab = "profile" | "buy" | "sell" | "history";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [entries, setEntries] = useState<ContestEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tab, setTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);

  // Buy form
  const [buyAmount, setBuyAmount] = useState(100);
  const [buyerName, setBuyerName] = useState("");
  const [upiTxnId, setUpiTxnId] = useState("");
  const [showNameTooltip, setShowNameTooltip] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState("");
  const [pendingBuy, setPendingBuy] = useState<number | null>(null);

  // Sell form
  const [sellAmount, setSellAmount] = useState(0);
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState("");
  const [pendingSell, setPendingSell] = useState<number | null>(null);

  async function fetchHistory() {
    const r = await fetch("/api/tokens/history");
    const data = await r.json();
    setTransactions(data.transactions || []);
  }

  useEffect(() => {
    async function load() {
      const [entriesRes] = await Promise.all([
        fetch("/api/contests/my-entries"),
        fetchHistory(),
      ]);
      const entriesData = await entriesRes.json();
      setEntries(entriesData.entries || []);
    }
    load().finally(() => setLoading(false));
  }, []);

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    setBuyLoading(true);
    setBuyError("");
    const res = await fetch("/api/tokens/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: buyAmount, buyerName, upiTransactionId: upiTxnId }),
    });
    const data = await res.json();
    setBuyLoading(false);
    if (!res.ok) { setBuyError(data.error); return; }
    setBuyAmount(100); setBuyerName(""); setUpiTxnId("");
    setPendingBuy(buyAmount);
    await fetchHistory();
    setTab("history");
  }

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    setSellLoading(true);
    setSellError("");
    const res = await fetch("/api/tokens/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: sellAmount }),
    });
    const data = await res.json();
    setSellLoading(false);
    if (!res.ok) { setSellError(data.error); return; }
    const submitted = sellAmount;
    setSellAmount(0);
    setPendingSell(submitted);
    refresh();
    await fetchHistory();
    setTab("history");
  }

  const typeLabels: Record<string, string> = {
    BUY_REQUEST: "Buy",
    SELL_REQUEST: "Sell",
    CONTEST_ENTRY: "Entry",
    CONTEST_PRIZE: "Prize",
    CONTEST_REFUND: "Refund",
  };

  const activeEntries = entries.filter(
    (e) => e.contest.status === "OPEN" || e.contest.status === "LOCKED"
  );
  const pastEntries = entries.filter((e) => e.contest.status === "COMPLETED");

  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: "My Activity" },
    { key: "buy", label: "Buy vINR" },
    { key: "sell", label: "Withdraw" },
    { key: "history", label: "History" },
  ];

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">@{user?.username}</h1>
            <p className="text-muted text-sm mt-0.5">{user?.email}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {user?.tokenBalance.toLocaleString()}
            </div>
            <div className="text-xs text-muted">vINR balance</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-background rounded-lg p-3 text-center">
            <div className="text-xs text-muted">Contests</div>
            <div className="font-bold text-lg">{entries.length}</div>
          </div>
          <div className="bg-background rounded-lg p-3 text-center">
            <div className="text-xs text-muted">Active</div>
            <div className="font-bold text-lg text-primary">{activeEntries.length}</div>
          </div>
          <div className="bg-background rounded-lg p-3 text-center">
            <div className="text-xs text-muted">Won</div>
            <div className="font-bold text-lg text-success">
              {entries.filter((e) => e.rank === 1).length}
            </div>
          </div>
        </div>
      </div>

      {/* Pending banners */}
      {pendingBuy && (
        <div className="rounded-lg bg-primary/10 border border-primary/30 px-4 py-3 flex items-start gap-3">
          <div className="mt-0.5 w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-primary">Buy request pending</div>
            <div className="text-xs text-muted mt-0.5">
              {pendingBuy} vINR will be credited once admin approves.
            </div>
          </div>
          <button onClick={() => setPendingBuy(null)} className="text-muted hover:text-foreground text-xs">✕</button>
        </div>
      )}
      {pendingSell && (
        <div className="rounded-lg bg-primary/10 border border-primary/30 px-4 py-3 flex items-start gap-3">
          <div className="mt-0.5 w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-primary">Withdrawal request pending</div>
            <div className="text-xs text-muted mt-0.5">
              {pendingSell} vINR withdrawal is being processed by admin.
            </div>
          </div>
          <button onClick={() => setPendingSell(null)} className="text-muted hover:text-foreground text-xs">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-lg p-1 border border-border overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key ? "bg-primary text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* My Activity tab */}
      {tab === "profile" && (
        <div className="space-y-6">
          {activeEntries.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Active Contests</h2>
              <div className="space-y-2">
                {activeEntries.map((entry) => (
                  <a
                    key={entry.id}
                    href={`/contests/${entry.contest.id}`}
                    className="block bg-card rounded-lg p-3 border border-border hover:bg-card-hover transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{entry.contest.name}</div>
                        <div className="text-xs text-muted">
                          {entry.contest.match.team1} vs {entry.contest.match.team2} &middot; {entry.teamName}
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        entry.contest.status === "LOCKED" ? "bg-primary/20 text-primary" : "bg-success/20 text-success"
                      }`}>
                        {entry.contest.status}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-muted text-sm">Loading...</div>
          ) : pastEntries.length > 0 ? (
            <div>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Past Contests</h2>
              <div className="space-y-2">
                {pastEntries.map((entry) => (
                  <a
                    key={entry.id}
                    href={`/contests/${entry.contest.id}`}
                    className="block bg-card rounded-lg p-3 border border-border hover:bg-card-hover transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{entry.contest.name}</div>
                        <div className="text-xs text-muted">
                          {entry.contest.match.team1} vs {entry.contest.match.team2} &middot; {entry.teamName}
                        </div>
                      </div>
                      <div className="text-right">
                        {entry.rank && (
                          <div className="text-sm font-semibold">#{entry.rank}</div>
                        )}
                        {entry.prizeWon > 0 ? (
                          <div className="text-xs text-success font-semibold">+{entry.prizeWon.toFixed(0)} vINR</div>
                        ) : (
                          <div className="text-xs text-muted">{entry.totalPoints.toFixed(1)} pts</div>
                        )}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            entries.length === 0 && (
              <div className="text-muted bg-card rounded-xl p-6 text-center text-sm border border-dashed border-border">
                No contests yet. Join one from a match!
              </div>
            )
          )}
        </div>
      )}

      {/* Buy tab */}
      {tab === "buy" && (
        <form onSubmit={handleBuy} className="max-w-sm space-y-4">
          <p className="text-sm text-muted">
            Request vINR and pay the admin via UPI. vINR will be credited once approved.
          </p>
          {buyError && (
            <div className="rounded-lg bg-danger/10 border border-danger/30 px-4 py-2 text-sm text-danger">{buyError}</div>
          )}
          <div>
            <label className="block text-sm text-muted mb-1.5">Amount (vINR)</label>
            <input
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              min={1}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-sm text-muted">Full Name *</label>
              <button
                type="button"
                onClick={() => setShowNameTooltip(!showNameTooltip)}
                className="w-4 h-4 rounded-full bg-muted/30 text-muted text-xs flex items-center justify-center hover:bg-muted/50 flex-shrink-0"
              >
                ?
              </button>
            </div>
            {showNameTooltip && (
              <div className="bg-card-hover border border-border rounded-lg px-3 py-2 text-xs text-muted mb-2 leading-relaxed">
                We need your full name as registered with your bank, so the admin can verify the UPI payment came from you.
              </div>
            )}
            <input
              type="text"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5">
              UPI Transaction ID <span className="text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={upiTxnId}
              onChange={(e) => setUpiTxnId(e.target.value)}
              placeholder="e.g. 123456789012"
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={buyLoading || !buyerName.trim()}
            className="w-full bg-primary text-white font-semibold rounded-lg py-2.5 hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {buyLoading ? "Requesting..." : "Request vINR"}
          </button>
        </form>
      )}

      {/* Sell tab */}
      {tab === "sell" && (
        <form onSubmit={handleSell} className="max-w-sm space-y-4">
          <p className="text-sm text-muted">
            Request withdrawal. Admin will pay you via UPI and deduct vINR.
          </p>
          {sellError && (
            <div className="rounded-lg bg-danger/10 border border-danger/30 px-4 py-2 text-sm text-danger">{sellError}</div>
          )}
          <div>
            <label className="block text-sm text-muted mb-1.5">
              Amount (max: {user?.tokenBalance} vINR)
            </label>
            <input
              type="number"
              value={sellAmount}
              onChange={(e) => setSellAmount(Number(e.target.value))}
              onFocus={(e) => e.target.select()}
              min={1}
              max={user?.tokenBalance}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              required
            />
          </div>
          <button
            type="submit"
            disabled={sellLoading}
            className="w-full bg-danger text-white font-semibold rounded-lg py-2.5 hover:bg-danger/80 disabled:opacity-50 transition-colors"
          >
            {sellLoading ? "Requesting..." : "Request Withdrawal"}
          </button>
        </form>
      )}

      {/* History tab */}
      {tab === "history" && (
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <div className="text-muted text-center py-6">No transactions yet</div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-card rounded-lg p-3 border border-border flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{typeLabels[tx.type] ?? tx.type}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      tx.status === "PENDING"
                        ? "bg-primary/15 text-primary"
                        : tx.status === "APPROVED"
                        ? "bg-success/15 text-success"
                        : "bg-danger/15 text-danger"
                    }`}>
                      {tx.status}
                    </span>
                    {tx.status === "PENDING" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  {tx.adminNote && (
                    <div className="text-xs text-muted mt-0.5">{tx.adminNote}</div>
                  )}
                  <div className="text-xs text-muted mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={`font-semibold text-sm ${
                  tx.type === "SELL_REQUEST" || tx.type === "CONTEST_ENTRY"
                    ? "text-danger"
                    : "text-success"
                }`}>
                  {tx.type === "SELL_REQUEST" || tx.type === "CONTEST_ENTRY" ? "-" : "+"}
                  {tx.amount}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
