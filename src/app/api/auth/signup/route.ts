import { NextResponse } from "next/server";
import { verifyOTP, createToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { email, otp, username, password } = await req.json();

  if (!email || !otp || !username || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  if (username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  // Consume OTP
  const valid = await verifyOTP(email.toLowerCase(), otp, true);
  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
  }

  // Check username taken
  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    return NextResponse.json({ error: "Username already taken" }, { status: 400 });
  }

  // Check email not already registered
  const existingEmail = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingEmail) {
    return NextResponse.json({ error: "Email already registered" }, { status: 400 });
  }

  const isAdmin = email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      username,
      passwordHash,
      role: isAdmin ? "ADMIN" : "USER",
    },
  });

  const token = createToken(user.id, user.role);
  const cookieStore = await cookies();
  cookieStore.set("stars11_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } });
}
