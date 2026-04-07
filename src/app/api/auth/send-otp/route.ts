import { NextResponse } from "next/server";
import { sendOTP } from "@/lib/auth";

// In-memory rate limiter: max 5 OTP requests per email per 10 minutes
const otpRateLimit = new Map<string, { count: number; resetAt: number }>();
const MAX_OTP_REQUESTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const entry = otpRateLimit.get(email);

  if (!entry || now > entry.resetAt) {
    otpRateLimit.set(email, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (entry.count >= MAX_OTP_REQUESTS) return true;

  entry.count++;
  return false;
}

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  if (isRateLimited(email.toLowerCase())) {
    return NextResponse.json(
      { error: "Too many OTP requests. Please wait 10 minutes before trying again." },
      { status: 429 }
    );
  }

  try {
    await sendOTP(email.toLowerCase());
    return NextResponse.json({ message: "OTP sent to your email" });
  } catch (e) {
    console.error("Failed to send OTP:", e);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
