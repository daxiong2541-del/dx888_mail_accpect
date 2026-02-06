import { NextResponse } from 'next/server';
import EmailConfig from '@/models/EmailConfig';
import { computeExpiresAt, getUserById, isDynmslEmail, parseEmails } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { userId, rawEmails, durationDays, maxCount, shareType } = await req.json();

    if (!userId || !rawEmails) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const emails = parseEmails(String(rawEmails)).filter((e) => isDynmslEmail(e));
    if (emails.length === 0) {
      return NextResponse.json({ error: 'No valid @dynmsl.com emails found' }, { status: 400 });
    }

    const safeDurationDays = Math.min(Math.max(Number(durationDays || 1), 1), 365);
    const safeMaxCount = Math.min(Math.max(Number(maxCount || 100), 1), 10000);
    const safeShareType = shareType === 'json' ? 'json' : 'html';
    const expiresAt = computeExpiresAt(safeDurationDays);

    const existing = await EmailConfig.find({ targetEmail: { $in: emails } }).select('targetEmail').lean();
    const existingSet = new Set(existing.map((d) => String(d.targetEmail).toLowerCase()));
    const toCreate = emails.filter((e) => !existingSet.has(e.toLowerCase()));

    const docs = toCreate.map((targetEmail) => ({
      userId,
      targetEmail,
      shareType: safeShareType,
      durationDays: safeDurationDays,
      maxCount: safeMaxCount,
      expiresAt,
    }));

    const created = docs.length > 0 ? await EmailConfig.insertMany(docs, { ordered: false }) : [];

    return NextResponse.json({
      success: true,
      createdCount: created.length,
      skippedCount: emails.length - created.length,
      configs: created,
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
