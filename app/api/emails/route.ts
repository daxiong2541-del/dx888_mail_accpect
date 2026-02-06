import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import EmailConfig from '@/models/EmailConfig';
import { computeExpiresAt, getUserById, isDynmslEmail, parseEmails } from '@/lib/auth';
import { addUsers } from '@/lib/externalApi';

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const ownerUserId = searchParams.get('ownerUserId');
    const q = (searchParams.get('q') || '').trim().toLowerCase();
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') || 100), 1), 500);
    const orderBy = (searchParams.get('orderBy') || 'updatedAt').trim();
    const order = (searchParams.get('order') || 'desc').trim();
    const createdFrom = (searchParams.get('createdFrom') || '').trim();
    const createdTo = (searchParams.get('createdTo') || '').trim();
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const queryUserId = user.isAdmin && ownerUserId ? ownerUserId : userId;

    const filter: Record<string, unknown> = {
      userId: queryUserId,
    };
    if (q) {
      filter.targetEmail = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') };
    }

    if (createdFrom || createdTo) {
      const range: Record<string, unknown> = {};
      if (createdFrom) {
        const d = new Date(createdFrom);
        if (!Number.isNaN(d.getTime())) range.$gte = d;
      }
      if (createdTo) {
        const d = new Date(createdTo);
        if (!Number.isNaN(d.getTime())) range.$lte = d;
      }
      if (Object.keys(range).length > 0) filter.createdAt = range;
    }

    const sortField = orderBy === 'createdAt' ? 'createdAt' : 'updatedAt';
    const sortDir = order === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> = { [sortField]: sortDir, _id: -1 };

    const total = await EmailConfig.countDocuments(filter);
    const configs = await EmailConfig.find(filter)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const normalized = configs.map((c) => ({
      ...c,
      _id: String(c._id),
      userId: String((c as unknown as { userId: unknown }).userId),
    }));

    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize,
      configs: normalized,
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = (await req.json()) as {
      userId?: string;
      mode?: 'import' | 'generate';
      rawEmails?: string;
      count?: number;
      charType?: 'number' | 'english';
      prefix?: string;
      charLength?: number;
      durationDays?: number;
      maxCount?: number;
      shareType?: 'json' | 'html';
    };

    if (!body.userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    const user = await getUserById(body.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const durationDays = clampNumber(body.durationDays, 1, 365, 1);
    const maxCount = clampNumber(body.maxCount, 1, 10000, 100);
    const shareType = body.shareType === 'json' ? 'json' : 'html';

    if (body.mode === 'generate') {
      const count = clampNumber(body.count, 1, 100, 10);
      const charType = body.charType === 'number' ? 'number' : 'english';
      const charLength = clampNumber(body.charLength, 4, 20, 8);
      const prefix = String(body.prefix || '');

      const generateRandomString = (length: number, type: string) => {
        const numbers = '0123456789';
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        const chars = type === 'number' ? numbers : type === 'mixed' ? letters + numbers : letters;
        let result = '';
        for (let i = 0; i < length; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      const list: { email: string; password: string }[] = [];
      const emails: string[] = [];
      for (let i = 0; i < count; i++) {
        const randomPart = generateRandomString(charLength, charType);
        const email = `${prefix}${randomPart}@dynmsl.com`.toLowerCase();
        if (!isDynmslEmail(email)) {
          return NextResponse.json({ error: 'Only @dynmsl.com emails allowed' }, { status: 400 });
        }
        const password = generateRandomString(10, 'mixed');
        list.push({ email, password });
        emails.push(email);
      }

      const existing = await EmailConfig.find({ targetEmail: { $in: emails } }).select('targetEmail').lean();
      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Email already exists', duplicates: existing.map((d) => d.targetEmail) },
          { status: 409 }
        );
      }

      const apiRes = await addUsers({ list });
      const apiCode = (apiRes as { code?: unknown } | null)?.code;
      const apiSuccess =
        (apiRes as { success?: unknown } | null)?.success === true ||
        apiCode === 0 ||
        apiCode === 200 ||
        apiCode === '0' ||
        apiCode === '200';
      if (!apiSuccess) {
        return NextResponse.json({ error: 'External API failed', detail: apiRes }, { status: 502 });
      }

      const expiresAt = computeExpiresAt(durationDays);
      const docs = list.map((acc) => ({
        userId: body.userId,
        targetEmail: acc.email,
        password: acc.password,
        source: 'generated',
        shareType,
        durationDays,
        maxCount,
        expiresAt,
      }));

      const created = await EmailConfig.insertMany(docs, { ordered: false });
      const normalized = created.map((c) => ({
        ...c.toObject(),
        _id: String(c._id),
        userId: String(c.userId),
      }));
      return NextResponse.json({ success: true, createdCount: created.length, configs: normalized });
    }

    const rawEmails = String(body.rawEmails || '');
    const emails = parseEmails(rawEmails)
      .map((e) => e.toLowerCase())
      .filter((e) => isDynmslEmail(e));

    if (emails.length === 0) {
      return NextResponse.json({ error: 'No valid @dynmsl.com emails found' }, { status: 400 });
    }

    const existing = await EmailConfig.find({ targetEmail: { $in: emails } }).select('targetEmail').lean();
    const existingSet = new Set(existing.map((d) => String(d.targetEmail).toLowerCase()));
    const toCreate = emails.filter((e) => !existingSet.has(e.toLowerCase()));
    const skippedEmails = emails.filter((e) => existingSet.has(e.toLowerCase()));

    const expiresAt = computeExpiresAt(durationDays);
    const docs = toCreate.map((targetEmail) => ({
      userId: body.userId,
      targetEmail,
      password: '',
      source: 'import',
      shareType,
      durationDays,
      maxCount,
      expiresAt,
    }));

    const created = docs.length > 0 ? await EmailConfig.insertMany(docs, { ordered: false }) : [];
    const normalized = created.map((c) => ({
      ...c.toObject(),
      _id: String(c._id),
      userId: String(c.userId),
    }));

    return NextResponse.json({
      success: true,
      createdCount: created.length,
      skippedCount: emails.length - created.length,
      skippedEmails,
      configs: normalized,
    });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
