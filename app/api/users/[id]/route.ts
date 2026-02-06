import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import EmailConfig from '@/models/EmailConfig';
import BatchRegistration from '@/models/BatchRegistration';
import { getUserById } from '@/lib/auth';
import mongoose from 'mongoose';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const requesterId = searchParams.get('userId');
    if (!requesterId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const requester = await getUserById(requesterId);
    if (!requester) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!requester.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    if (String(requesterId) === String(id)) {
      return NextResponse.json({ error: 'Cannot delete self' }, { status: 400 });
    }

    const target = await User.findById(id).lean();
    if (!target) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (target.isAdmin) {
      const adminsCount = await User.countDocuments({ isAdmin: true });
      if (adminsCount <= 1) {
        return NextResponse.json({ error: 'Cannot delete last admin' }, { status: 400 });
      }
    }

    await EmailConfig.deleteMany({ userId: new mongoose.Types.ObjectId(id) });
    await BatchRegistration.deleteMany({ userId: new mongoose.Types.ObjectId(id) });
    await User.deleteOne({ _id: new mongoose.Types.ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

