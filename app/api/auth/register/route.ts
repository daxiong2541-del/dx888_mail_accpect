import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { username, password, adminUserId } = await req.json();

    try {
      const idx = await User.collection.indexes();
      for (const i of idx) {
        const key = i?.key as Record<string, unknown> | undefined;
        if (key && Object.prototype.hasOwnProperty.call(key, 'email')) {
          if (i.name) {
            await User.collection.dropIndex(i.name);
          }
        }
      }
    } catch {
      // ignore
    }

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    if (normalizedUsername.length < 3 || normalizedUsername.length > 32) {
      return NextResponse.json({ error: 'Username length must be 3-32' }, { status: 400 });
    }

    const usersCount = await User.countDocuments();
    if (usersCount > 0) {
      if (!adminUserId || !mongoose.isValidObjectId(adminUserId)) {
        return NextResponse.json({ error: 'Registration disabled' }, { status: 403 });
      }
      const admin = await User.findById(adminUserId).lean();
      if (!admin || !admin.isAdmin) {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      }
    }

    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const shouldBeAdmin = usersCount === 0;

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: normalizedUsername,
      password: hashedPassword,
      isAdmin: shouldBeAdmin,
    });

    return NextResponse.json({ success: true, userId: user._id });
  } catch (err: unknown) {
    const e = err as { name?: string; code?: unknown; message?: string; errors?: unknown };
    if (e?.code === 11000) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }
    if (e?.name === 'CastError') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    if (e?.name === 'ValidationError') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
