import { NextResponse } from "next/server";
import { sendOTP } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    // Don't reveal whether email exists
    return NextResponse.json({ message: "If that email is registered, an OTP has been sent" });
  }

  try {
    await sendOTP(email.toLowerCase());
  } catch (e) {
    console.error("Failed to send OTP:", e);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }

  return NextResponse.json({ message: "OTP sent to your email" });
}
