"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  adminNote: string | null;
  createdAt: string;
}

export default function TokensPage() {
  const { user, refresh } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [buyAmount, setBuyAmount] = useState(100);
  const [buyerName, setBuyerName] = useState("");
  const [upiTxnId, setUpiTxnId] = useState("");
  const [showNameTooltip, setShowNameTooltip] = useState(false);
  const [sellAmount, setSellAmount] = useState(0);
  const [tab, setTab] = useState<"buy" | "sell" | "history">("buy");
  const [loading, setLoading] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{ type: "buy" | "sell"; amount: number } | null>(null);
  const [error, setError] = useState("");

  async function fetchHistory() {
    const r = await fetch("/api/tokens/history");
    const data = await r.json();
    setTransactions(data.transactions || []);
  }

  useEffect(() => {
    fetchHistory();
  }, []);

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/tokens/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: buyAmount, buyerName, upiTransactionId: upiTxnId }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    // Reset form
    setBuyAmount(100);
    setBuyerName("");
    setUpiTxnId("");
    setPendingRequest({ type: "buy", amount: buyAmount });
    await fetchHistory();
    setTab("history");
  }

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/tokens/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: sellAmount }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    const submitted = sellAmount;
    setSellAmount(0);
    setPendingRequest({ type: "sell", amount: submitted });
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

  const statusColors: Record<string, string> = {
    PENDING: "text-primary",
    APPROVED: "text-success",
    REJECTED: "text-danger",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Wallet</h1>
      <div className="bg-primary/20 text-primary text-2xl font-bold rounded-xl p-4 text-center mb-6">
        {user?.tokenBalance.toLocaleString()} vINR
      </div>

      {/* Pending request banner */}
      {pendingRequest && (
        <div className="mb-4 rounded-lg bg-primary/10 border border-primary/30 px-4 py-3 flex items-start gap-3">
          <div className="mt-0.5 w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
          <div>
            <div className="text-sm font-semibold text-primary">
              {pendingRequest.type === "buy" ? "Buy" : "Withdrawal"} request pending
            </div>
            <div className="text-xs text-muted mt-0.5">
              {pendingRequest.type === "buy"
                ? `${pendingRequest.amount} vINR will be credited once admin approves.`
                : `${pendingRequest.amount} vINR withdrawal is being processed by admin.`}
              {" "}You can track it in History.
            </div>
          </div>
          <button
            onClick={() => setPendingRequest(null)}
            className="ml-auto text-muted hover:text-foreground text-xs flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-danger/10 border border-danger/30 px-4 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex gap-1 bg-card rounded-lg p-1 mb-6">
        {(["buy", "sell", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(""); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t ? "bg-primary text-background" : "text-muted hover:text-foreground"
            }`}
          >
            {t === "buy" ? "Buy vINR" : t === "sell" ? "Withdraw" : "History"}
          </button>
        ))}
      </div>

      {tab === "buy" && (
        <form onSubmit={handleBuy} className="max-w-sm space-y-4">
          <p className="text-sm text-muted">
            Request vINR and pay the admin via UPI. vINR will be credited once approved.
          </p>

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
                className="w-4 h-4 rounded-full bg-muted/30 text-muted text-xs flex items-center justify-center hover:bg-muted/50 transition-colors flex-shrink-0"
              >
                ?
              </button>
            </div>
            {showNameTooltip && (
              <div className="bg-card-hover border border-border rounded-lg px-3 py-2 text-xs text-muted mb-2 leading-relaxed">
                We need your full name as registered with your bank, so the admin can verify that the UPI payment came from you.
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
            disabled={loading || !buyerName.trim()}
            className="w-full bg-primary text-background font-semibold rounded-lg py-2.5 hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {loading ? "Requesting..." : "Request vINR"}
          </button>
        </form>
      )}

      {tab === "sell" && (
        <form onSubmit={handleSell} className="max-w-sm">
          <p className="text-sm text-muted mb-4">
            Request withdrawal. Admin will pay you via UPI and deduct vINR.
          </p>
          <label className="block text-sm text-muted mb-1.5">
            Amount (max: {user?.tokenBalance})
          </label>
          <input
            type="number"
            value={sellAmount}
            onChange={(e) => setSellAmount(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            min={1}
            max={user?.tokenBalance}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:border-primary"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-danger text-white font-semibold rounded-lg py-2.5 hover:bg-danger/80 disabled:opacity-50 transition-colors"
          >
            {loading ? "Requesting..." : "Request Withdrawal"}
          </button>
        </form>
      )}

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
                <div className="text-right">
                  <div
                    className={`font-semibold text-sm ${
                      tx.type === "SELL_REQUEST" || tx.type === "CONTEST_ENTRY"
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {tx.type === "SELL_REQUEST" || tx.type === "CONTEST_ENTRY" ? "-" : "+"}
                    {tx.amount}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
