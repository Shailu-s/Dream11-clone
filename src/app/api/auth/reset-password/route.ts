import { NextResponse } from "next/server";
import { verifyOTP } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, otp, password } = await req.json();

  if (!email || !otp || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const valid = await verifyOTP(email.toLowerCase(), otp, true);
  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { passwordHash },
  });

  return NextResponse.json({ message: "Password updated successfully" });
}
