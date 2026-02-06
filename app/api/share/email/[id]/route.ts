import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmailConfig from '@/models/EmailConfig';
import { getEmailList } from '@/lib/externalApi';
import mongoose from 'mongoose';

function stripScripts(html: string) {
  return String(html || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return new NextResponse('Invalid id', { status: 400 });
    }
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'json'; // json or html

    const config = await EmailConfig.findById(id);

    if (!config) {
      return new NextResponse('Config not found', { status: 404 });
    }

    if (!config.shareType) {
      config.shareType = 'html';
    }

    // Check expiration
    if (new Date() > config.expiresAt) {
      return new NextResponse('Link Expired (Time Limit)', { status: 410 });
    }

    // Check count limit
    if (config.receivedCount >= config.maxCount) {
      return new NextResponse('Link Expired (Max Count Reached)', { status: 410 });
    }

    // Call external API
    let emails: Array<{ toEmail?: string; content?: string; createTime?: string; subject?: string }> = [];
    try {
        const raw = await getEmailList({ toEmail: config.targetEmail });
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as { data?: unknown }).data)
            ? ((raw as { data: unknown[] }).data)
            : [];
        emails = list as Array<{ toEmail?: string; content?: string; createTime?: string; subject?: string }>;
    } catch {
        return new NextResponse('Error fetching emails', { status: 502 });
    }

    const first = emails[0] as { toEmail?: string; content?: string; createTime?: string; subject?: string } | undefined;
    const hasData = Boolean(first);
    const msg = hasData ? '读取成功' : '未收到邮件';

    if (hasData) {
      config.receivedCount += 1;
      try {
        await config.save();
      } catch {
        await EmailConfig.updateOne(
          { _id: config._id },
          { $set: { shareType: config.shareType || 'html' }, $inc: { receivedCount: 1 } }
        );
      }
    }

    if (type === 'html') {
      const bodyHtml = hasData ? stripScripts(String(first?.content || '')) : '';
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email List - ${config.targetEmail}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: system-ui, sans-serif; padding: 20px; max-width: 800px; mx-auto; }
            .email-item { border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 8px; }
            .meta { color: #666; font-size: 0.9em; margin-bottom: 5px; }
            .subject { font-weight: bold; font-size: 1.1em; color: #333; }
            .content { margin-top: 10px; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>${config.targetEmail}</h1>
          <p>${msg}</p>
          <p>Remaining: ${config.maxCount - config.receivedCount}</p>
          ${hasData ? `<div class="email-item"><div class="meta">To: ${first?.toEmail || ''} <br/>Time: ${first?.createTime || ''}</div><div class="subject">${first?.subject || ''}</div><div class="content">${bodyHtml}</div></div>` : ''}
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    } else {
      const remainingChecks = config.maxCount - config.receivedCount;
      return NextResponse.json({
        success: true,
        msg,
        remainingChecks,
        data: hasData ? [first] : []
      });
    }

  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
