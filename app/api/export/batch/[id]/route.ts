import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BatchRegistration from '@/models/BatchRegistration';
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  const { id } = await params;
  const task = await BatchRegistration.findById(id).lean();
  if (!task) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const configIds: string[] = [];
  for (const acc of task.generatedAccounts || []) {
    if (acc.emailConfigId) configIds.push(String(acc.emailConfigId));
  }
  const configs = await EmailConfig.find({ _id: { $in: configIds } }).lean();
  const cfgMap = new Map<string, { expiresAt?: string; maxCount?: number; receivedCount?: number; shareType?: string }>();
  for (const cfg of configs) {
    cfgMap.set(String(cfg._id), {
      expiresAt: cfg.expiresAt ? new Date(cfg.expiresAt).toISOString() : undefined,
      maxCount: Number(cfg.maxCount || 0),
      receivedCount: Number(cfg.receivedCount || 0),
      shareType: (cfg as unknown as { shareType?: string }).shareType,
    });
  }

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const baseUrl = host ? `${proto}://${host}` : '';

  const header = ['email', 'status', 'share', 'remainingChecks', 'expiresAt'];
  const rows = [header.join(',')];
  for (const acc of task.generatedAccounts || []) {
    const info = acc.emailConfigId ? cfgMap.get(String(acc.emailConfigId)) : undefined;
    const remaining = info ? (info.maxCount || 0) - (info.receivedCount || 0) : '';
    const shareType = info?.shareType === 'json' ? 'json' : 'html';
    const share =
      acc.emailConfigId
        ? shareType === 'json'
          ? baseUrl
            ? `${baseUrl}/api/share/email/${acc.emailConfigId}`
            : `/api/share/email/${acc.emailConfigId}`
          : baseUrl
            ? `${baseUrl}/share/email/${acc.emailConfigId}`
            : `/share/email/${acc.emailConfigId}`
        : '';
    rows.push(
      [
        csvEscape(String(acc.email || '')),
        csvEscape(String(acc.status || '')),
        csvEscape(String(share)),
        csvEscape(String(remaining)),
        csvEscape(formatZhDateTime(String(info?.expiresAt || ''))),
      ].join(',')
    );
  }

  const csv = rows.join('\n');
  const filename = `batch-${id}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=${filename}`,
    },
  });
}
