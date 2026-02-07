import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') || 'http';
  const host = h.get('x-forwarded-host') || h.get('host');
  if (host) return `${proto}://${host}`;

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return 'http://localhost:3000';
}

export default async function ShareBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/api/share/batch/${id}`, { cache: 'no-store' });

  if (!res.ok) {
    const text = await res.text();
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>访问失败</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{text}</pre>
      </div>
    );
  }

  const data = (await res.json()) as {
    success: boolean;
    task: {
      count: number;
      charType: string;
      status: string;
      accounts: Array<{ email: string; password?: string; status?: string }>;
    };
  };

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>批量注册结果</h1>
      <div style={{ color: '#666', marginBottom: 16 }}>
        数量：{data.task.count} | 类型：{data.task.charType} | 状态：{data.task.status}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>邮箱</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>密码</th>
            <th style={{ border: '1px solid #ddd', padding: 8, textAlign: 'left' }}>状态</th>
          </tr>
        </thead>
        <tbody>
          {data.task.accounts.map((acc, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{acc.email}</td>
              <td style={{ border: '1px solid #ddd', padding: 8, fontFamily: 'monospace' }}>{acc.password || ''}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{acc.status || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
