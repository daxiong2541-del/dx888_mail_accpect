import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmailConfig from '@/models/EmailConfig';

function csvEscape(value: string) {
  const v = value.replace(/"/g, '""');
  return `"${v}"`;
}

function formatZhDateTime(value: string | Date | null | undefined) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const y = get('year');
  const m = get('month');
  const day = get('day');
  const hh = get('hour');
  const mm = get('minute');
  const ss = get('second');
  return `${y}年${m}月${day}日${hh}:${mm}:${ss}`;
}

function getBaseUrl(req: Request) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  if (!host) return '';
  return `${proto}://${host}`;
}

export async function GET(req: Request) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 });
  }

  const configs = await EmailConfig.find({ userId }).sort({ createdAt: -1 }).lean();
  const baseUrl = getBaseUrl(req);

  const header = ['targetEmail', 'share', 'shareType', 'expiresAt', 'remainingChecks'];
  const rows = [header.join(',')];

  for (const cfg of configs) {
    const id = String(cfg._id);
    const shareType = (cfg as unknown as { shareType?: string }).shareType === 'json' ? 'json' : 'html';
    const share =
      shareType === 'json'
        ? baseUrl
          ? `${baseUrl}/api/share/email/${id}`
          : `/api/share/email/${id}`
        : baseUrl
          ? `${baseUrl}/share/email/${id}`
          : `/share/email/${id}`;
    const remaining = Number(cfg.maxCount || 0) - Number(cfg.receivedCount || 0);
    rows.push(
      [
        csvEscape(String(cfg.targetEmail || '')),
        csvEscape(share),
        csvEscape(shareType),
        csvEscape(formatZhDateTime(cfg.expiresAt ? new Date(cfg.expiresAt) : '')),
        csvEscape(String(remaining)),
      ].join(',')
    );
  }

  const csv = rows.join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=emails.csv',
    },
  });
}
