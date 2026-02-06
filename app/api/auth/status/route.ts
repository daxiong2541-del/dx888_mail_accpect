import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();
    const usersCount = await User.countDocuments();
    return NextResponse.json({
      success: true,
      allowPublicRegistration: usersCount === 0,
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

