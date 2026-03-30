import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSession();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Subtle glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/8 blur-[140px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <span className="text-xl font-black tracking-tighter text-primary">WGF</span>
        <div className="flex items-center gap-4">
          <Link href="/docs" className="text-sm text-muted hover:text-foreground transition-colors">
            How it works
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold bg-primary text-background px-4 py-2 rounded-xl hover:bg-primary-hover transition-colors"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">

        {/* Logo */}
        <div className="mb-8 select-none">
          <div className="text-[96px] sm:text-[140px] font-black tracking-tighter leading-none text-primary drop-shadow-[0_0_60px_rgba(245,158,11,0.35)]">
            WGF
          </div>
          <div className="text-sm sm:text-base uppercase tracking-[0.3em] text-muted mt-2 font-medium">
            Who Gets Fucked?
          </div>
        </div>

        {/* Tagline */}
        <p className="text-2xl sm:text-3xl font-bold mb-3 max-w-lg">
          A fantasy cricket game.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/login"
            className="px-8 py-3.5 bg-primary text-background font-bold rounded-2xl hover:bg-primary-hover transition-all text-base shadow-lg shadow-primary/25"
          >
            Let&apos;s Play
          </Link>
          <Link
            href="/docs"
            className="px-8 py-3.5 bg-card border border-border text-foreground font-semibold rounded-2xl hover:bg-card-hover transition-all text-base"
          >
            How it works
          </Link>
        </div>
      </main>

      <footer className="relative z-10 text-center text-xs text-muted py-6 border-t border-border mt-16">
        WGF · Fantasy cricket for degenerates · IPL 2026
      </footer>
    </div>
  );
}
