import { NextResponse } from "next/server";
import { verifyOTP } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Verify OTP — returns whether user exists (to decide next step: login vs signup)
export async function POST(req: Request) {
  const { email, otp } = await req.json();

  if (!email || !otp) {
    return NextResponse.json({ error: "Email and OTP required" }, { status: 400 });
  }

  const valid = await verifyOTP(email.toLowerCase(), otp, false);
  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  return NextResponse.json({
    verified: true,
    isNewUser: !user,
  });
}
