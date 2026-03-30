"use client";

import { AuthProvider, useAuth } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar
        username={user.username}
        tokenBalance={user.tokenBalance}
        isAdmin={user.role === "ADMIN"}
      />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
