import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getUserById } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const users = await User.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({
      success: true,
      users: users.map((u) => ({
        _id: String(u._id),
        username: String(u.username),
        isAdmin: Boolean(u.isAdmin),
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : undefined,
        updatedAt: u.updatedAt ? new Date(u.updatedAt).toISOString() : undefined,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

