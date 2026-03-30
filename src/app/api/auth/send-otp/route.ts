import { NextResponse } from "next/server";
import { sendOTP } from "@/lib/auth";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  try {
    await sendOTP(email.toLowerCase());
    return NextResponse.json({ message: "OTP sent to your email" });
  } catch (e) {
    console.error("Failed to send OTP:", e);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
