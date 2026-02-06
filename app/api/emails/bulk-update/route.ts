import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmailConfig from '@/models/EmailConfig';
import { getUserById } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = (await req.json()) as {
      userId?: string;
      ids?: string[];
      shareType?: 'json' | 'html';
    };

    if (!body.userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const validIds = ids.filter((id) => typeof id === 'string' && mongoose.isValidObjectId(id));
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid ids' }, { status: 400 });
    }

    const shareType = body.shareType === 'json' ? 'json' : body.shareType === 'html' ? 'html' : null;
    if (!shareType) {
      return NextResponse.json({ error: 'shareType required' }, { status: 400 });
    }

    const user = await getUserById(body.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const filter = user.isAdmin
      ? { _id: { $in: validIds } }
      : { _id: { $in: validIds }, userId: new mongoose.Types.ObjectId(body.userId) };

    const result = await EmailConfig.updateMany(filter, { $set: { shareType } });
    return NextResponse.json({
      success: true,
      matchedCount: (result as unknown as { matchedCount?: number }).matchedCount ?? 0,
      modifiedCount: (result as unknown as { modifiedCount?: number }).modifiedCount ?? 0,
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

