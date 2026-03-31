import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="text-xl font-bold text-primary">WGF</Link>
        <Link href="/login" className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-hover transition-colors">
          Login
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">How WGF works</h1>
        <p className="text-muted mb-12">Everything you need to know to play, earn, and withdraw.</p>

        {/* Section: vINR */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xl">₹</div>
            <h2 className="text-xl font-bold">What is vINR?</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 space-y-3 text-sm leading-relaxed text-muted">
            <p>
              <span className="text-foreground font-medium">vINR (Virtual INR)</span> is the currency used on WGF.
              Think of it as virtual rupees — 1 vINR ≈ ₹1 in value when you decide to withdraw.
            </p>
            <p>
              All contest entry fees, prizes, and payouts are in vINR.
              Real money transfers happen outside the app directly between you and the admin via UPI.
            </p>
            <p>
              Everyone who signs up gets <span className="text-primary font-semibold">100 vINR free</span> to start playing.
            </p>
          </div>
        </section>

        {/* Section: Get vINR */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center text-xl">+</div>
            <h2 className="text-xl font-bold">How to get vINR</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 text-sm leading-relaxed text-muted space-y-4">
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-success/20 text-success text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <p>Go to <span className="text-foreground font-medium">Tokens → Buy vINR</span> and enter how much you want.</p>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-success/20 text-success text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <p>Send the equivalent amount in rupees to the admin via <span className="text-foreground font-medium">UPI</span>. The admin's UPI ID will be shared with you.</p>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-success/20 text-success text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <p>Once the admin confirms payment, your vINR balance is credited. You'll see it update in the app.</p>
            </div>
            <div className="mt-2 bg-success/10 border border-success/20 rounded-xl px-4 py-3 text-success text-xs">
              New users get 100 vINR free on signup — no payment needed to try your first contest.
            </div>
          </div>
        </section>

        {/* Section: Withdraw */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center text-xl">↓</div>
            <h2 className="text-xl font-bold">How to withdraw vINR</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 text-sm leading-relaxed text-muted space-y-4">
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <p>Go to <span className="text-foreground font-medium">Tokens → Withdraw</span> and enter the amount.</p>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <p>Your vINR is <span className="text-foreground font-medium">held immediately</span> — it won't be usable until the request is resolved.</p>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <p>Admin approves the request and sends you the equivalent rupees via UPI. The vINR is then deducted from your balance.</p>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-secondary/20 text-secondary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              <p>If admin rejects the request, your held vINR is returned to your balance.</p>
            </div>
          </div>
        </section>

        {/* Section: How to play */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-xl">🏏</div>
            <h2 className="text-xl font-bold">How to play</h2>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6 text-sm leading-relaxed text-muted space-y-4">
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-foreground font-medium mb-1">Create or join a contest</p>
                <p>Any user can create a contest for an upcoming IPL match. Set an entry fee and share the invite code with friends. Or join someone else's contest using their code.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              <div>
                <p className="text-foreground font-medium mb-1">Pick your team</p>
                <p>Select 11 players from the two competing IPL squads. You have a 100-credit salary cap. Pick at least 1 WK, 3 BAT, 1 AR, 3 BOWL. Max 7 players from one team.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              <div>
                <p className="text-foreground font-medium mb-1">Choose Captain & Vice-Captain</p>
                <p>Your Captain earns <span className="text-primary font-semibold">2× points</span> and your Vice-Captain earns <span className="text-primary font-semibold">1.5× points</span>. This is where matches are won or lost.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              <div>
                <p className="text-foreground font-medium mb-1">Watch the match</p>
                <p>Teams lock at match start. Follow the live game on Cricbuzz or Hotstar — WGF doesn't show live scores.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
              <div>
                <p className="text-foreground font-medium mb-1">Results & prizes</p>
                <p>After the match, admin enters the scorecard. Fantasy points are calculated and prizes are distributed automatically to winners' vINR balances.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Scoring */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-card-hover flex items-center justify-center text-xl">📊</div>
            <h2 className="text-xl font-bold">Fantasy points scoring</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-muted mb-3">Batting</div>
              <div className="space-y-1.5 text-sm">
                {[
                  ["Run", "+1"],
                  ["Four", "+1 bonus"],
                  ["Six", "+2 bonus"],
                  ["50 runs", "+8"],
                  ["100 runs", "+16"],
                  ["Duck", "−2"],
                ].map(([label, pts]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted">{label}</span>
                    <span className={pts.startsWith("−") ? "text-danger" : "text-success"}>{pts}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-muted mb-3">Bowling</div>
              <div className="space-y-1.5 text-sm">
                {[
                  ["Wicket", "+25"],
                  ["LBW/Bowled", "+8 bonus"],
                  ["3 wickets", "+4"],
                  ["4 wickets", "+8"],
                  ["5 wickets", "+16"],
                  ["Maiden", "+12"],
                ].map(([label, pts]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted">{label}</span>
                    <span className="text-success">{pts}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-muted mb-3">Fielding</div>
              <div className="space-y-1.5 text-sm">
                {[
                  ["Catch", "+8"],
                  ["Stumping", "+12"],
                  ["Run out (direct)", "+12"],
                  ["Run out (indirect)", "+6"],
                  ["Captain", "2× pts"],
                  ["Vice-Captain", "1.5× pts"],
                ].map(([label, pts]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted">{label}</span>
                    <span className="text-primary">{pts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-block px-8 py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary-hover transition-all text-base shadow-lg shadow-primary/20"
          >
            Start Playing
          </Link>
        </div>
      </main>

      <footer className="text-center text-xs text-muted py-8 border-t border-border mt-12">
        WGF · Private fantasy cricket · IPL 2026
      </footer>
    </div>
  );
}
