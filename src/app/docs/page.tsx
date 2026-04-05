import Link from "next/link";
import { getSession } from "@/lib/auth";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  const id = slugify(title);

  return (
    <section id={id} className="mb-14 scroll-mt-24">
      <div className="flex items-center gap-3 mb-5 group">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-lg">{icon}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold">{title}</h2>
          <Link
            href={`/docs#${id}`}
            aria-label={`Link to ${title}`}
            className="text-xs font-semibold text-primary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity border border-primary/20 bg-primary/10 rounded-full px-2 py-0.5"
          >
            #
          </Link>
        </div>
      </div>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 text-sm leading-relaxed text-muted space-y-4">
      {children}
    </div>
  );
}

function Step({ n, color, title, children }: { n: number; color: string; title?: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    primary: "bg-primary/20 text-primary",
    success: "bg-success/20 text-success",
    secondary: "bg-secondary/20 text-secondary",
  };
  return (
    <div className="flex gap-4">
      <span className={`w-6 h-6 rounded-full ${colors[color]} text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5`}>{n}</span>
      <div>
        {title && <p className="text-foreground font-medium mb-1">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

function Note({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "success" }) {
  const styles = {
    info: "bg-secondary/10 border-secondary/20 text-secondary",
    warning: "bg-primary/10 border-primary/20 text-primary",
    success: "bg-success/10 border-success/20 text-success",
  };
  return (
    <div className={`${styles[type]} border rounded-xl px-4 py-3 text-xs leading-relaxed`}>
      {children}
    </div>
  );
}

export default async function DocsPage() {
  const user = await getSession();
  const ctaHref = user ? "/dashboard" : "/login";
  const ctaLabel = user ? "Go to Dashboard" : "Play Now";
  const sections = [
    "What is WGF?",
    "Joining a Contest",
    "Team Selection Rules",
    "What is vINR?",
    "Depositing vINR",
    "Withdrawing vINR",
    "Fantasy Points Scoring",
    "After the Match",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex flex-col leading-none">
          <span className="text-xl font-black text-primary tracking-tight">WGF</span>
          <span className="text-[9px] font-medium text-primary/70 tracking-wide">Who Gets Fucked?</span>
        </div>
        <Link href={ctaHref} className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-hover transition-colors">
          {ctaLabel}
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">

        {/* Hero */}
        <div className="mb-14">
          <h1 className="text-3xl font-black mb-3">How WGF Works</h1>
          <p className="text-muted text-base leading-relaxed">
            WGF is a private fantasy cricket platform built for friend groups. Pick your XI, outsmart your crew, and walk away with the pot — or get absolutely fucked trying.
          </p>
        </div>

        <div className="mb-14 bg-card border border-border rounded-2xl p-5">
          <div className="text-xs uppercase tracking-[0.24em] text-muted font-semibold mb-3">Jump To</div>
          <div className="flex flex-wrap gap-2">
            {sections.map((title) => {
              const id = slugify(title);
              return (
                <Link
                  key={id}
                  href={`/docs#${id}`}
                  className="text-xs font-semibold bg-background border border-border rounded-full px-3 py-1.5 text-muted hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  {title}
                </Link>
              );
            })}
          </div>
        </div>

        {/* What is WGF */}
        <Section icon="🏏" title="What is WGF?">
          <Card>
            <p>
              WGF is a <span className="text-foreground font-medium">Dream11-style fantasy cricket game</span> for your friend group.
              Every IPL match, anyone can create a contest — set an entry fee, invite friends via a code, and whoever picks the best XI wins the prize pool.
            </p>
            <p>
              No random strangers. No giant pools. Just you, your friends, and whoever reads Cricbuzz the hardest.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                ["Create", "Set up a contest for any upcoming match"],
                ["Pick XI", "Choose 11 players within the salary cap"],
                ["Win", "Top scorers split the prize pool"],
              ].map(([title, desc]) => (
                <div key={title} className="bg-primary/8 rounded-xl p-3 text-center">
                  <div className="text-foreground font-bold text-sm mb-1">{title}</div>
                  <div className="text-xs text-muted">{desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* Joining a Contest */}
        <Section icon="🎯" title="Joining a Contest">
          <Card>
            <Step n={1} color="primary" title="Find a match">
              Go to <span className="text-foreground font-medium">Home</span> — upcoming IPL matches are listed. Tap any match to see contests for it, or browse all contests under <span className="text-foreground font-medium">Contests</span>.
            </Step>
            <Step n={2} color="primary" title="Join or create">
              Join an existing contest with an invite code, or create your own — set the entry fee and prize split, then share the code with friends.
            </Step>
            <Step n={3} color="primary" title="Pick your XI">
              Select 11 players from both teams within the <span className="text-foreground font-medium">100-credit salary cap</span>. Follow the role constraints below.
            </Step>
            <Step n={4} color="primary" title="Name your Captain & Vice-Captain">
              Captain scores <span className="text-primary font-semibold">2× points</span>. Vice-Captain scores <span className="text-primary font-semibold">1.5× points</span>. This is the most important pick.
            </Step>
            <Step n={5} color="primary" title="Pay the entry fee & lock in">
              Entry fee is deducted from your vINR balance. Your team is locked once the match starts — no edits after that.
            </Step>
            <Note type="info">
              You can enter multiple teams in the same contest. Each team costs one entry fee.
            </Note>
          </Card>
        </Section>

        {/* Team Rules */}
        <Section icon="📋" title="Team Selection Rules">
          <Card>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-foreground font-semibold mb-2">Role constraints</p>
                <div className="space-y-1.5">
                  {[
                    ["Wicket Keepers", "1–4"],
                    ["Batters", "2–6"],
                    ["All-Rounders", "1–4"],
                    ["Bowlers", "2–6"],
                    ["Total players", "11"],
                  ].map(([role, rule]) => (
                    <div key={role} className="flex justify-between text-sm">
                      <span className="text-muted">{role}</span>
                      <span className="text-foreground font-medium">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-foreground font-semibold mb-2">Other rules</p>
                <div className="space-y-1.5 text-sm text-muted">
                  <p>Max <span className="text-foreground font-medium">7 players</span> from one team</p>
                  <p><span className="text-foreground font-medium">100 credits</span> salary cap total</p>
                  <p>Must pick exactly <span className="text-foreground font-medium">1 Captain</span> and <span className="text-foreground font-medium">1 Vice-Captain</span></p>
                  <p>Teams lock at <span className="text-foreground font-medium">match start time</span></p>
                  <p>Other teams are hidden until match starts</p>
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* vINR */}
        <Section icon="₹" title="What is vINR?">
          <Card>
            <p>
              <span className="text-foreground font-medium">vINR (Virtual INR)</span> is WGF&apos;s in-app currency.
              1 vINR = ₹1 in real value. All entry fees, prizes, and payouts happen in vINR.
              Real money moves outside the app via UPI between you and the admin.
            </p>
            <Note type="info">
              New users start with <span className="font-bold">0 vINR</span>. Add balance from the wallet before joining paid contests.
            </Note>
          </Card>
        </Section>

        {/* Deposit */}
        <Section icon="+" title="Depositing vINR">
          <Card>
            <p className="text-foreground font-medium">Want to play bigger? Add more vINR to your wallet.</p>
            <Step n={1} color="success" title="Make a buy request">
              Go to <span className="text-foreground font-medium">Profile → Buy vINR</span>. Enter the amount you want to add.
            </Step>
            <Step n={2} color="success" title="Pay via UPI">
              Send the equivalent amount in rupees to the admin&apos;s UPI ID (shared separately by the admin). Make a note of your <span className="text-foreground font-medium">UPI Transaction ID</span>.
            </Step>
            <Step n={3} color="success" title="Enter transaction ID">
              Paste your UPI Transaction ID in the request form before submitting. This helps the admin verify your payment.
            </Step>
            <Step n={4} color="success" title="Wait for approval">
              Once the admin verifies the payment, your vINR is credited. You&apos;ll see your balance update in the app. Requests are usually approved within a few hours.
            </Step>
            <Note type="info">
              If your request is rejected, nothing is deducted — no vINR is created until admin approves.
            </Note>
          </Card>
        </Section>

        {/* Withdraw */}
        <Section icon="↓" title="Withdrawing vINR">
          <Card>
            <p className="text-foreground font-medium">Won some contests? Cash out your earnings.</p>
            <Step n={1} color="secondary" title="Make a withdraw request">
              Go to <span className="text-foreground font-medium">Profile → Withdraw</span>. Enter the amount you want to withdraw.
            </Step>
            <Step n={2} color="secondary" title="Funds are held immediately">
              The requested vINR is <span className="text-foreground font-medium">deducted from your balance right away</span> and held pending approval. You can&apos;t spend it in contests during this time.
            </Step>
            <Step n={3} color="secondary" title="Admin pays you via UPI">
              Admin sends the equivalent rupees to the same UPI account you used to deposit. Then approves the request and the vINR is permanently deducted.
            </Step>
            <Step n={4} color="secondary" title="If rejected">
              Your held vINR is returned to your balance automatically.
            </Step>
            <Note type="info">
              You can request withdrawal for any available vINR balance in your wallet, subject to admin approval.
            </Note>
          </Card>
        </Section>

        {/* Scoring */}
        <Section icon="📊" title="Fantasy Points Scoring">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-muted mb-3 font-semibold">Batting</div>
              <div className="space-y-2 text-sm">
                {[
                  ["Run", "+1"],
                  ["Four bonus", "+1"],
                  ["Six bonus", "+2"],
                  ["Half century", "+8"],
                  ["Century", "+16"],
                  ["Duck", "−2"],
                ].map(([label, pts]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted">{label}</span>
                    <span className={pts.startsWith("−") ? "text-danger font-medium" : "text-success font-medium"}>{pts}</span>
                  </div>
                ))}
                <div className="pt-2 text-xs text-muted border-t border-border">
                  Strike rate bonus/penalty applies (min 10 balls faced)
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-muted mb-3 font-semibold">Bowling</div>
              <div className="space-y-2 text-sm">
                {[
                  ["Wicket", "+25"],
                  ["LBW / Bowled", "+8"],
                  ["3-wicket haul", "+4"],
                  ["4-wicket haul", "+8"],
                  ["5-wicket haul", "+16"],
                  ["Maiden over", "+12"],
                ].map(([label, pts]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted">{label}</span>
                    <span className="text-success font-medium">{pts}</span>
                  </div>
                ))}
                <div className="pt-2 text-xs text-muted border-t border-border">
                  Economy rate bonus/penalty applies (min 2 overs)
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="text-xs uppercase tracking-widest text-muted mb-3 font-semibold">Fielding & Multipliers</div>
              <div className="space-y-2 text-sm">
                {[
                  ["Catch", "+8"],
                  ["Stumping", "+12"],
                  ["Direct run out", "+12"],
                  ["Indirect run out", "+6"],
                ].map(([label, pts]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted">{label}</span>
                    <span className="text-success font-medium">{pts}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 space-y-2">
                  {[
                    ["Captain", "2× all pts"],
                    ["Vice-Captain", "1.5× all pts"],
                  ].map(([label, pts]) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-muted">{label}</span>
                      <span className="text-primary font-semibold">{pts}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* After the match */}
        <Section icon="🏆" title="After the Match">
          <Card>
            <p>
              WGF does not show live scores. Follow the match on <span className="text-foreground font-medium">Cricbuzz</span> or <span className="text-foreground font-medium">Hotstar</span>.
            </p>
            <p>
              Once the match ends, the admin enters the scorecard. Fantasy points are calculated automatically and the leaderboard updates. Prize money is credited to winners&apos; vINR balances instantly.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                ["🥇", "1st place", "Biggest share of the prize pool"],
                ["🥈", "2nd place", "Runner-up prize"],
                ["🥉", "3rd place", "Consolation prize"],
              ].map(([icon, rank, desc]) => (
                <div key={rank} className="bg-primary/8 rounded-xl p-3 text-center">
                  <div className="text-xl mb-1">{icon}</div>
                  <div className="text-foreground font-bold text-xs mb-0.5">{rank}</div>
                  <div className="text-xs text-muted">{desc}</div>
                </div>
              ))}
            </div>
            <Note type="info">
              Prize distribution is set by the contest creator when creating the contest. You can see the exact split before joining.
            </Note>
          </Card>
        </Section>

        {/* CTA */}
        <div className="text-center pt-4">
          <p className="text-muted text-sm mb-5">Ready to find out who gets fucked?</p>
          <Link
            href={ctaHref}
            className="inline-block px-10 py-3.5 bg-primary text-white font-bold rounded-2xl hover:bg-primary-hover transition-all text-base shadow-lg shadow-primary/20"
          >
            {user ? "Go to Dashboard" : "Start Playing — It's Free"}
          </Link>
        </div>

      </main>

      <footer className="text-center text-xs text-muted py-8 border-t border-border mt-16">
        WGF · Where friendships come to die · IPL 2026
      </footer>
    </div>
  );
}
