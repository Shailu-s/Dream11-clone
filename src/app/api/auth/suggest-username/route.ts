import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADJECTIVES = ["fast", "bold", "sharp", "royal", "wild", "golden", "thunder", "mighty", "brave", "swift"];
const NOUNS = ["bat", "six", "yorker", "bouncer", "spin", "cover", "wicket", "mid_on", "square", "googly"];

export async function GET() {
  // Try up to 10 random combos until we find one not taken
  for (let i = 0; i < 10; i++) {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    const suggestion = `${adj}_${noun}${num}`;

    const existing = await prisma.user.findUnique({ where: { username: suggestion } });
    if (!existing) {
      return NextResponse.json({ username: suggestion });
    }
  }

  // Fallback with timestamp suffix (guaranteed unique)
  return NextResponse.json({ username: `player_${Date.now().toString().slice(-5)}` });
}
