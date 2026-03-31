"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

interface NavbarProps {
  username: string;
  tokenBalance: number;
  isAdmin: boolean;
}

export default function Navbar({ username, tokenBalance, isAdmin }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const navItems = [
    { href: "/dashboard", label: "Home" },
    { href: "/contests", label: "Contests" },
    { href: "/leaderboard", label: "Board" },
    { href: "/profile", label: "Profile" },
    { href: "/docs", label: "How it works" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/dashboard" className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-primary tracking-tight">WGF</span>
            <span className="text-[10px] font-medium text-primary/70 tracking-wide hidden sm:inline">Who Gets Fucked?</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  pathname === item.href
                    ? "bg-primary/20 text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="bg-primary/20 text-primary text-sm font-semibold px-3 py-1 rounded-full hover:bg-primary/30 transition-colors"
            >
              ₹{tokenBalance.toLocaleString()} vINR
            </Link>
            <Link
              href="/profile"
              className="text-sm text-muted hover:text-foreground transition-colors hidden sm:block font-medium"
            >
              @{username}
            </Link>
            <button
              onClick={toggle}
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted hover:text-foreground hover:border-primary/40 transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1 text-xs text-muted hover:text-danger border border-border hover:border-danger/50 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              Logout
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-muted p-1"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-3 space-y-1">
            <div className="px-3 py-2 border-b border-border mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">@{username}</span>
              <span className="text-xs text-primary font-semibold bg-primary/15 px-2 py-0.5 rounded-full">
                ₹{tokenBalance.toLocaleString()} vINR
              </span>
            </div>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm ${
                  pathname === item.href
                    ? "bg-primary/20 text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-border mt-2 pt-2 space-y-1">
              <button
                onClick={toggle}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground transition-colors"
              >
                {theme === "dark" ? "☀️  Light mode" : "🌙  Dark mode"}
              </button>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
