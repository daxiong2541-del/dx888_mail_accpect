import dbConnect from '@/lib/db';
import SystemSettings from '@/models/SystemSettings';

type SettingsSnapshot = {
  dynmslApiToken: string;
  dynmslApiBaseUrl: string;
};

let cached: { value: SettingsSnapshot; expiresAt: number } | null = null;

export async function getSystemSettings(): Promise<SettingsSnapshot> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  await dbConnect();
  const doc = await SystemSettings.findById('system').lean();
  const value: SettingsSnapshot = {
    dynmslApiToken: String((doc as unknown as { dynmslApiToken?: string } | null)?.dynmslApiToken || ''),
    dynmslApiBaseUrl: String((doc as unknown as { dynmslApiBaseUrl?: string } | null)?.dynmslApiBaseUrl || ''),
  };

  cached = { value, expiresAt: now + 30_000 };
  return value;
}

export function clearSystemSettingsCache() {
  cached = null;
}

export async function setDynmslSettings(input: {
  userId: string;
  dynmslApiToken?: string;
  dynmslApiBaseUrl?: string;
}) {
  await dbConnect();
  const update: Record<string, unknown> = { updatedBy: input.userId };
  if (typeof input.dynmslApiToken === 'string') update.dynmslApiToken = input.dynmslApiToken.trim();
  if (typeof input.dynmslApiBaseUrl === 'string') update.dynmslApiBaseUrl = input.dynmslApiBaseUrl.trim();

  await SystemSettings.updateOne(
    { _id: 'system' },
    { $set: update, $setOnInsert: { _id: 'system' } },
    { upsert: true }
  );
  clearSystemSettingsCache();
}

