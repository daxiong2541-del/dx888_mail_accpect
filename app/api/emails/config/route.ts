import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmailConfig from '@/models/EmailConfig';
import { computeExpiresAt, getUserById, isDynmslEmail } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { userId, targetEmail, durationDays, maxCount, shareType } = await req.json();

    if (!userId || !targetEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!isDynmslEmail(targetEmail)) {
      return NextResponse.json({ error: 'Only @dynmsl.com emails allowed' }, { status: 400 });
    }

    const normalizedEmail = String(targetEmail).toLowerCase();
    const existing = await EmailConfig.findOne({ targetEmail: normalizedEmail }).select('_id').lean();
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const safeDurationDays = Math.min(Math.max(Number(durationDays || 1), 1), 365);
    const safeMaxCount = Math.min(Math.max(Number(maxCount || 100), 1), 10000);
    const safeShareType = shareType === 'json' ? 'json' : 'html';

    const config = await EmailConfig.create({
      userId,
      targetEmail: normalizedEmail,
      shareType: safeShareType,
      durationDays: safeDurationDays,
      maxCount: safeMaxCount,
      expiresAt: computeExpiresAt(safeDurationDays),
    });

    return NextResponse.json({ success: true, config });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const configs = await EmailConfig.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, configs });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
