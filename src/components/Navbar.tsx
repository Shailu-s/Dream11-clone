"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

interface NavbarProps {
  username: string;
  tokenBalance: number;
  isAdmin: boolean;
}

export default function Navbar({ username, tokenBalance, isAdmin }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const navItems = [
    { href: "/dashboard", label: "Home" },
    { href: "/contests", label: "Contests" },
    { href: "/leaderboard", label: "Board" },
    { href: "/tokens", label: "Wallet" },
    { href: "/profile", label: "Profile" },
  ];

  if (isAdmin) {
    navItems.push({ href: "/admin", label: "Admin" });
  }

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            WGF
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

          <div className="flex items-center gap-3">
            <div className="bg-primary/20 text-primary text-sm font-semibold px-3 py-1 rounded-full">
              ₹{tokenBalance.toLocaleString()} vINR
            </div>
            <span className="text-sm text-muted hidden sm:block">@{username}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-muted hover:text-danger transition-colors hidden md:block"
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
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 rounded-lg text-sm text-danger"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
