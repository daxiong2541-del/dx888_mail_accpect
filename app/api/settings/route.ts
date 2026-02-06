import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/auth';
import { getSystemSettings, setDynmslSettings } from '@/lib/systemSettings';

export async function GET(req: Request) {
  try {
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

    const settings = await getSystemSettings();
    return NextResponse.json({
      success: true,
      dynmslApiBaseUrl: settings.dynmslApiBaseUrl,
      dynmslApiTokenSet: Boolean(settings.dynmslApiToken),
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as {
      userId?: string;
      dynmslApiToken?: string;
      dynmslApiBaseUrl?: string;
    };
    if (!body.userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    const user = await getUserById(body.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    await setDynmslSettings({
      userId: body.userId,
      dynmslApiToken: body.dynmslApiToken,
      dynmslApiBaseUrl: body.dynmslApiBaseUrl,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

