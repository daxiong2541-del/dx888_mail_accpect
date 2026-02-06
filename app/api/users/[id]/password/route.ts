import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getUserById } from '@/lib/auth';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = (await req.json()) as { userId?: string; newPassword?: string };
    if (!body.userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    const requester = await getUserById(body.userId);
    if (!requester) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!requester.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const newPassword = String(body.newPassword || '');
    if (newPassword.length < 6 || newPassword.length > 72) {
      return NextResponse.json({ error: 'Password length must be 6-72' }, { status: 400 });
    }

    const target = await User.findById(id);
    if (!target) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    target.password = hashedPassword;
    await target.save();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

