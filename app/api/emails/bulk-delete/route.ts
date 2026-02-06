import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmailConfig from '@/models/EmailConfig';
import { getUserById } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = (await req.json()) as { userId?: string; ids?: string[] };

    if (!body.userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    const ids = Array.isArray(body.ids) ? body.ids : [];
    const validIds = ids.filter((id) => typeof id === 'string' && mongoose.isValidObjectId(id));
    if (validIds.length === 0) {
      return NextResponse.json({ error: 'No valid ids' }, { status: 400 });
    }

    const user = await getUserById(body.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const filter = user.isAdmin
      ? { _id: { $in: validIds } }
      : { _id: { $in: validIds }, userId: new mongoose.Types.ObjectId(body.userId) };

    const result = await EmailConfig.deleteMany(filter);
    return NextResponse.json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

