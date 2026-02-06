'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [allowPublicRegistration, setAllowPublicRegistration] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) router.replace('/dashboard');
    axios
      .get('/api/auth/status')
      .then((res) => setAllowPublicRegistration(Boolean(res.data.allowPublicRegistration)))
      .catch(() => setAllowPublicRegistration(false));
  }, [router]);

  const login = async () => {
    try {
      setError('');
      const res = await axios.post('/api/auth/login', { username, password });
      localStorage.setItem('userId', res.data.userId);
      localStorage.setItem('isAdmin', String(Boolean(res.data.isAdmin)));
      router.replace('/dashboard');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { error?: string } | undefined)?.error || '登录失败');
      } else {
        setError('登录失败');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 text-black">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4">登录</h1>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <input
          className="w-full p-2 border mb-2 rounded"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="w-full p-2 border mb-4 rounded"
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full bg-blue-500 text-white p-2 rounded mb-2 hover:bg-blue-600 active:bg-blue-700 transition" onClick={login}>
          登录
        </button>
        {allowPublicRegistration && (
          <button className="w-full text-blue-500 text-sm hover:underline" onClick={() => router.push('/register')}>
            初始化管理员账号
          </button>
        )}
      </div>
    </div>
  );
}
