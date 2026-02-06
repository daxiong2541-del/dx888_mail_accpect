'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';

type UserRow = {
  _id: string;
  username: string;
  isAdmin: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function UsersPage() {
  const [userId, setUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const uid = localStorage.getItem('userId') || '';
    setUserId(uid);
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');
  }, []);

  const load = async () => {
    if (!userId) return;
    const res = await axios.get(`/api/users?userId=${userId}`);
    setUsers(res.data.users);
  };

  useEffect(() => {
    if (userId && isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isAdmin]);

  const createUser = async () => {
    try {
      setBusy(true);
      setError('');
      await axios.post('/api/auth/register', { username, password, adminUserId: userId });
      setUsername('');
      setPassword('');
      await load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { error?: string } | undefined)?.error || '创建失败');
      } else {
        setError('创建失败');
      }
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (targetUserId: string) => {
    try {
      setBusy(true);
      setError('');
      await axios.patch(`/api/users/${targetUserId}/password`, { userId, newPassword: resetPasswordValue });
      setResetPasswordUserId(null);
      setResetPasswordValue('');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { error?: string } | undefined)?.error || '重置失败');
      } else {
        setError('重置失败');
      }
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (targetUserId: string, targetUsername: string) => {
    if (!confirm(`确认删除用户 ${targetUsername} 以及其名下所有邮箱数据？`)) return;
    try {
      setBusy(true);
      setError('');
      await axios.delete(`/api/users/${targetUserId}?userId=${userId}`);
      await load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { error?: string } | undefined)?.error || '删除失败');
      } else {
        setError('删除失败');
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
        <h1 className="text-xl font-bold mb-2">用户管理</h1>
        <div className="text-sm text-gray-600">系统已有管理员后，禁止公开注册；只能由管理员在此创建用户。</div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </div>

      <div className="bg-white rounded shadow p-6">
        <div className="text-lg font-bold mb-3">创建用户</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="border rounded p-2" placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input
            className="border rounded p-2"
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 active:bg-blue-800 transition" onClick={createUser} disabled={busy}>
            创建
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">用户列表</h2>
          <button className="text-blue-600 text-sm" onClick={load} disabled={busy}>
            刷新
          </button>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">用户名</th>
                <th className="border p-2 text-left">角色</th>
                <th className="border p-2 text-left">创建时间</th>
                <th className="border p-2 text-left">更新时间</th>
                <th className="border p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="border p-2">{u.username}</td>
                  <td className="border p-2">{u.isAdmin ? '管理员' : '用户'}</td>
                  <td className="border p-2">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                  <td className="border p-2">{u.updatedAt ? new Date(u.updatedAt).toLocaleString() : '-'}</td>
                  <td className="border p-2">
                    {resetPasswordUserId === u._id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="border rounded p-1 text-xs w-40"
                          type="password"
                          placeholder="新密码(>=6位)"
                          value={resetPasswordValue}
                          onChange={(e) => setResetPasswordValue(e.target.value)}
                          disabled={busy}
                        />
                        <button
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 active:bg-blue-800 transition"
                          onClick={() => resetPassword(u._id)}
                          disabled={busy}
                        >
                          保存
                        </button>
                        <button
                          className="text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-100 active:bg-gray-200 transition"
                          onClick={() => {
                            setResetPasswordUserId(null);
                            setResetPasswordValue('');
                          }}
                          disabled={busy}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          className="text-blue-700 text-xs hover:underline"
                          onClick={() => setResetPasswordUserId(u._id)}
                          disabled={busy}
                        >
                          重置密码
                        </button>
                        <button
                          className="text-red-600 text-xs hover:underline"
                          onClick={() => deleteUser(u._id, u.username)}
                          disabled={busy}
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
