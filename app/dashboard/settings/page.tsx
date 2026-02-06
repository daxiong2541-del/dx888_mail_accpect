'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

export default function SettingsPage() {
  const [userId, setUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [dynmslApiBaseUrl, setDynmslApiBaseUrl] = useState('');
  const [dynmslApiToken, setDynmslApiToken] = useState('');
  const [dynmslApiTokenSet, setDynmslApiTokenSet] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    const uid = localStorage.getItem('userId') || '';
    setUserId(uid);
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');
  }, []);

  const load = async (uid: string) => {
    const res = await axios.get(`/api/settings?userId=${uid}`);
    setDynmslApiBaseUrl(String(res.data.dynmslApiBaseUrl || ''));
    setDynmslApiTokenSet(Boolean(res.data.dynmslApiTokenSet));
  };

  useEffect(() => {
    if (!userId || !isAdmin) return;
    load(userId).catch(() => {
      setError('加载失败');
    });
  }, [userId, isAdmin]);

  const save = async () => {
    try {
      setBusy(true);
      setError('');
      setOk('');
      await axios.put('/api/settings', {
        userId,
        dynmslApiBaseUrl,
        dynmslApiToken: dynmslApiToken ? dynmslApiToken : undefined,
      });
      setDynmslApiToken('');
      await load(userId);
      setOk('已保存');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { error?: string } | undefined)?.error || '保存失败');
      } else {
        setError('保存失败');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!isAdmin) {
    return <div className="bg-white rounded shadow p-6">仅管理员可访问</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded shadow p-6">
        <h1 className="text-xl font-bold mb-2">系统设置</h1>
        <div className="text-sm text-gray-600">仅管理员可配置外部邮件系统的 Token</div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        {ok && <div className="text-green-700 text-sm mt-2">{ok}</div>}
      </div>

      <div className="bg-white rounded shadow p-6 space-y-4">
        <div>
          <div className="text-sm font-semibold mb-1">DYNMSL_API_BASE_URL</div>
          <input
            className="border rounded p-2 w-full"
            value={dynmslApiBaseUrl}
            onChange={(e) => setDynmslApiBaseUrl(e.target.value)}
            placeholder="例如：https://mail.dynmsl.com/api/public"
            disabled={busy}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold">DYNMSL_API_TOKEN</div>
            <div className="text-xs text-gray-600">当前状态：{dynmslApiTokenSet ? '已设置' : '未设置'}</div>
          </div>
          <input
            className="border rounded p-2 w-full"
            type="password"
            value={dynmslApiToken}
            onChange={(e) => setDynmslApiToken(e.target.value)}
            placeholder={dynmslApiTokenSet ? '输入新 token 将覆盖旧 token' : '输入 token'}
            disabled={busy}
          />
          <div className="text-xs text-gray-500 mt-1">为安全起见，页面不会回显已保存的 token。</div>
        </div>

        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 active:bg-blue-800 transition" onClick={save} disabled={busy}>
          保存
        </button>
      </div>
    </div>
  );
}
