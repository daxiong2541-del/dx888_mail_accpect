import dbConnect from '@/lib/db';
import User from '@/models/User';

export type AuthedUser = {
  _id: string;
  username: string;
  isAdmin: boolean;
};

export async function getUserById(userId: string): Promise<AuthedUser | null> {
  await dbConnect();
  const user = await User.findById(userId).lean();
  if (!user) return null;
  return {
    _id: String(user._id),
    username: String(user.username),
    isAdmin: Boolean(user.isAdmin),
  };
}

export function isDynmslEmail(email: string) {
  return /@dynmsl\.com$/i.test(email);
}

export function parseEmails(input: string): string[] {
  const lines = input
    .split(/\r?\n|,|;|\s+/)
    .map((v) => v.trim())
    .filter(Boolean);
  const unique = new Set<string>();
  for (const email of lines) {
    unique.add(email.toLowerCase());
  }
  return Array.from(unique);
}

export function computeExpiresAt(durationDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + durationDays);
  return date;
}
