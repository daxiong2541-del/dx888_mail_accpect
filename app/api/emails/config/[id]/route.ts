import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmailConfig from '@/models/EmailConfig';
import { computeExpiresAt, getUserById } from '@/lib/auth';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = (await req.json()) as {
      userId?: string;
      password?: string;
      durationDays?: number;
      maxCount?: number;
      shareType?: 'json' | 'html';
      resetCounts?: boolean;
    };

    if (!body.userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const user = await getUserById(body.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cfg = await EmailConfig.findById(id);
    if (!cfg) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isOwner = String(cfg.userId) === String(body.userId);
    if (!isOwner && !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const nextDuration = typeof body.durationDays === 'number' ? body.durationDays : cfg.durationDays;
    const nextMax = typeof body.maxCount === 'number' ? body.maxCount : cfg.maxCount;

    cfg.durationDays = Math.min(Math.max(Number(nextDuration || 1), 1), 365);
    cfg.maxCount = Math.min(Math.max(Number(nextMax || 100), 1), 10000);
    cfg.expiresAt = computeExpiresAt(cfg.durationDays);

    if (typeof body.password === 'string') {
      cfg.password = body.password;
    }

    if (body.shareType) {
      cfg.shareType = body.shareType === 'json' ? 'json' : 'html';
    }

    if (body.resetCounts) {
      cfg.receivedCount = 0;
    }

    await cfg.save();

    return NextResponse.json({ success: true, config: cfg });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cfg = await EmailConfig.findById(id).lean();
    if (!cfg) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isOwner = String(cfg.userId) === String(userId);
    if (!isOwner && !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await EmailConfig.deleteOne({ _id: id });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
