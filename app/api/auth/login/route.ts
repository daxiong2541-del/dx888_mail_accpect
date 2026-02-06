import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { username, password } = await req.json();

    const normalizedUsername = String(username || '').trim().toLowerCase();
    if (!normalizedUsername || !password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // In a real app, set a cookie or return a JWT. 
    // For this task, we'll return the userId for simple client-side handling.
    return NextResponse.json({
      success: true,
      userId: user._id,
      username: user.username,
      isAdmin: Boolean(user.isAdmin),
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
