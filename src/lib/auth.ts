import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import nodemailer from "nodemailer";
import { randomUUID } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "stars11_default_secret";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  auth: {
    user: "a685f6001@smtp-brevo.com",
    pass: process.env.BREVO_SMTP_KEY,
  },
});

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(email: string): Promise<void> {
  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate old unused OTPs for this email
  await prisma.$executeRawUnsafe(
    `UPDATE otp_codes SET used = true WHERE email = $1 AND used = false`,
    email
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO otp_codes (id, email, code, "expiresAt") VALUES ($1, $2, $3, $4)`,
    randomUUID(),
    email,
    code,
    expiresAt
  );

  await transporter.sendMail({
    from: '"Stars11" <srajawat5868@gmail.com>',
    to: email,
    subject: "Your Stars11 OTP",
    text: `Your Stars11 verification code is: ${code}\n\nThis code expires in 10 minutes.`,
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto">
        <h2 style="color:#22c55e">Stars11</h2>
        <p>Your verification code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#22c55e;padding:16px 0">${code}</div>
        <p style="color:#888;font-size:13px">Expires in 10 minutes. Do not share this code.</p>
      </div>
    `,
  });
}

export async function verifyOTP(
  email: string,
  code: string,
  consume = true
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; code: string; expiresAt: Date; used: boolean }>
  >(
    `SELECT id, code, "expiresAt", used FROM otp_codes WHERE email = $1 AND used = false ORDER BY "createdAt" DESC LIMIT 1`,
    email
  );

  if (!rows.length) return false;
  const row = rows[0];
  if (row.used) return false;
  if (new Date() > row.expiresAt) return false;
  if (row.code !== code) return false;

  if (consume) {
    await prisma.$executeRawUnsafe(
      `UPDATE otp_codes SET used = true WHERE id = $1`,
      row.id
    );
  }

  return true;
}

export function createToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(
  token: string
): { userId: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("stars11_token")?.value;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  return user;
}

export async function requireAuth() {
  const user = await getSession();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}
