'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type EmailItem = {
  toEmail?: string;
  content?: string;
  createTime?: string;
  subject?: string;
};

function formatRemaining(ms: number) {
  const safe = Math.max(0, Math.floor(ms));
  if (safe <= 0) return '已过期';
  const totalSeconds = Math.floor(safe / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days) parts.push(`${days}天`);
  if (hours || days) parts.push(`${hours}小时`);
  if (minutes || hours || days) parts.push(`${minutes}分钟`);
  parts.push(`${seconds}秒`);
  return parts.join(' ');
}

function stripScripts(html: string) {
  return String(html || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

function extractBodyHtml(html: string) {
  const s = String(html || '');
  const m = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : s;
}

export default function ShareEmailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingChecks, setRemainingChecks] = useState<number>(0);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [msg, setMsg] = useState<string>('');
  const [email, setEmail] = useState<EmailItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });
    fetch(`/api/share/email/${id}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<{ remainingChecks: number; remainingMs?: number | null; msg?: string; data: EmailItem[] }>;
      })
      .then((json) => {
        if (cancelled) return;
        setRemainingChecks(json.remainingChecks);
        setRemainingMs(typeof json.remainingMs === 'number' ? json.remainingMs : null);
        setMsg(String(json.msg || ''));
        const list = Array.isArray(json.data) ? json.data : [];
        setEmail(list[0] || null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '加载失败');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        Invalid id
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        加载中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>访问失败</div>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{error}</pre>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>邮件</div>
      <div style={{ color: '#333', marginBottom: 8 }}>{msg}</div>
      <div style={{ color: '#666', marginBottom: 16 }}>剩余次数：{remainingChecks}</div>
      <div style={{ color: '#666', marginBottom: 16 }}>剩余时间：{remainingMs === null ? '-' : formatRemaining(remainingMs)}</div>
      {!email ? (
        <div>未收到邮件</div>
      ) : (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, background: '#fff' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{email.subject || '(无主题)'}</div>
          <div style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>
            {email.toEmail || ''} {email.createTime ? `| ${email.createTime}` : ''}
          </div>
          <div
            style={{ whiteSpace: 'normal' }}
            dangerouslySetInnerHTML={{
              __html: stripScripts(extractBodyHtml(String(email.content || ''))),
            }}
          />
        </div>
      )}
      </div>
    </div>
  );
}
