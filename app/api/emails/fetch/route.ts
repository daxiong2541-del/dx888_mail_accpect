import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmailConfig from '@/models/EmailConfig';
import { getEmailList } from '@/lib/externalApi';

export const preferredRegion = ['hkg1'];

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { configId, userId } = await req.json();

    const config = await EmailConfig.findOne({ _id: configId, userId });

    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    // Check expiration
    if (new Date() > config.expiresAt) {
      return NextResponse.json({ error: 'Configuration expired' }, { status: 403 });
    }

    // Check count limit
    if (config.receivedCount >= config.maxCount) {
      return NextResponse.json({ error: 'Max count reached' }, { status: 403 });
    }

    // Call external API
    const data = await getEmailList({ toEmail: config.targetEmail });

    // Update count (assuming 1 fetch = 1 count, or based on data length?)
    // "Times" usually means "number of operations".
    // If user meant "number of emails", I should use data.data.length.
    // I'll increment by 1 for "one successful fetch operation" for now, as it's safer.
    // But if "times" refers to the quantity of items (emails), it should be length.
    // Given "days and times" often refers to "duration and frequency/limit".
    // I'll increment by 1 fetch.
    config.receivedCount += 1;
    await config.save();

    return NextResponse.json({ success: true, data: data.data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
