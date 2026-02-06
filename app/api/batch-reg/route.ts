import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BatchRegistration from '@/models/BatchRegistration';
import { addUsers } from '@/lib/externalApi';
import { isDynmslEmail } from '@/lib/auth';
import EmailConfig from '@/models/EmailConfig';
import { computeExpiresAt } from '@/lib/auth';

export const preferredRegion = ['hkg1'];

function generateRandomString(length: number, type: 'number' | 'english' | 'mixed') {
  let chars = '';
  if (type === 'number') chars = '0123456789';
  else if (type === 'english') chars = 'abcdefghijklmnopqrstuvwxyz';
  else chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { userId, count, charType, prefix, charLength, durationDays, maxCount, shareType } = await req.json();

    if (!userId || !count || !charType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const length = charLength || 8; // Default to 8 if not provided
    if (length < 4 || length > 20) {
        return NextResponse.json({ error: 'Length must be between 4 and 20' }, { status: 400 });
    }

    const safeDurationDays = Math.min(Math.max(Number(durationDays || 1), 1), 365);
    const safeMaxCount = Math.min(Math.max(Number(maxCount || 100), 1), 10000);
    const safeShareType = shareType === 'json' ? 'json' : 'html';

    if (count > 100) { // Safety limit
       return NextResponse.json({ error: 'Max 100 at a time' }, { status: 400 });
    }

    const list = [];
    const generatedAccounts: Array<{ email: string; password: string; status: string; emailConfigId?: string }> = [];

    for (let i = 0; i < count; i++) {
      const randomPart = generateRandomString(length, charType);
      const email = `${prefix || ''}${randomPart}@dynmsl.com`.toLowerCase();
      if (!isDynmslEmail(email)) {
        return NextResponse.json({ error: 'Only @dynmsl.com emails allowed' }, { status: 400 });
      }
      const password = generateRandomString(10, 'mixed');

      list.push({ email, password });
      generatedAccounts.push({ email, password, status: 'pending' });
    }

    const emails = generatedAccounts.map((a) => a.email.toLowerCase());
    const existing = await EmailConfig.find({ targetEmail: { $in: emails } }).select('targetEmail').lean();
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Generated emails conflict with existing records', duplicates: existing.map((d) => d.targetEmail) },
        { status: 409 }
      );
    }

    let apiSuccess = false;
    try {
      const apiRes = await addUsers({ list });
      const apiCode = (apiRes as { code?: unknown } | null)?.code;
      apiSuccess =
        (apiRes as { success?: unknown } | null)?.success === true ||
        apiCode === 0 ||
        apiCode === 200 ||
        apiCode === '0' ||
        apiCode === '200';
    } catch {
      apiSuccess = false;
    }

    // Update statuses
    generatedAccounts.forEach(acc => acc.status = apiSuccess ? 'success' : 'failed');

    const expiresAt = computeExpiresAt(safeDurationDays);
    const emailDocs = generatedAccounts.map((acc) => ({
      userId,
      targetEmail: acc.email,
      shareType: safeShareType,
      durationDays: safeDurationDays,
      maxCount: safeMaxCount,
      expiresAt,
    }));

    const createdEmailConfigs = await EmailConfig.insertMany(emailDocs, { ordered: false });
    const idMap = new Map<string, string>();
    for (const cfg of createdEmailConfigs) {
      idMap.set(String(cfg.targetEmail).toLowerCase(), String(cfg._id));
    }
    generatedAccounts.forEach((acc) => {
      acc.emailConfigId = idMap.get(String(acc.email).toLowerCase());
    });

    const task = await BatchRegistration.create({
      userId,
      charType,
      charLength: length,
      count,
      durationDays: safeDurationDays,
      maxCount: safeMaxCount,
      shareType: safeShareType,
      status: apiSuccess ? 'completed' : 'failed',
      generatedAccounts
    });

    return NextResponse.json({ success: true, task });

  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
    try {
      await dbConnect();
      const { searchParams } = new URL(req.url);
      const userId = searchParams.get('userId');
  
      if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      }
  
      const tasks = await BatchRegistration.find({ userId }).sort({ createdAt: -1 }).lean();

      const configIds: string[] = [];
      const emails: string[] = [];
      for (const t of tasks) {
        for (const acc of t.generatedAccounts || []) {
          if (acc.emailConfigId) configIds.push(String(acc.emailConfigId));
          if (acc.email) emails.push(String(acc.email).toLowerCase());
        }
      }

      const configs = await EmailConfig.find({
        $or: [{ _id: { $in: configIds } }, { targetEmail: { $in: emails } }],
      }).lean();
      const cfgMap = new Map<string, { expiresAt?: string; maxCount?: number; receivedCount?: number; shareType?: string }>();
      const emailToId = new Map<string, string>();
      for (const cfg of configs) {
        cfgMap.set(String(cfg._id), {
          expiresAt: cfg.expiresAt ? new Date(cfg.expiresAt).toISOString() : undefined,
          maxCount: Number(cfg.maxCount || 0),
          receivedCount: Number(cfg.receivedCount || 0),
          shareType: (cfg as unknown as { shareType?: string }).shareType,
        });
        if (cfg.targetEmail) {
          emailToId.set(String(cfg.targetEmail).toLowerCase(), String(cfg._id));
        }
      }

      const enriched = tasks.map((t) => ({
        ...t,
        generatedAccounts: (t.generatedAccounts || []).map((acc: { email: string; password?: string; status?: string; emailConfigId?: string }) => {
          const resolvedId = acc.emailConfigId || emailToId.get(String(acc.email).toLowerCase());
          const info = resolvedId ? cfgMap.get(String(resolvedId)) : undefined;
          const remainingChecks = info ? (info.maxCount || 0) - (info.receivedCount || 0) : undefined;
          const remainingMs = info?.expiresAt ? new Date(info.expiresAt).getTime() - Date.now() : undefined;
          return {
            ...acc,
            emailConfigId: resolvedId,
            expiresAt: info?.expiresAt,
            remainingChecks,
            remainingMs,
            shareType: info?.shareType,
          };
        }),
      }));

      return NextResponse.json({ success: true, tasks: enriched });
    } catch {
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
