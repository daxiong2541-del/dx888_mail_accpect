'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
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
      .then((res) => {
        const allowed = Boolean(res.data.allowPublicRegistration);
        setAllowPublicRegistration(allowed);
        if (!allowed) router.replace('/login');
      })
      .catch(() => {
        setAllowPublicRegistration(false);
        router.replace('/login');
      });
  }, [router]);

  const register = async () => {
    try {
      setError('');
      const res = await axios.post('/api/auth/register', { username, password });
      localStorage.setItem('userId', res.data.userId);
      router.replace('/dashboard');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { error?: string } | undefined)?.error || '注册失败');
      } else {
        setError('注册失败');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 text-black">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4">初始化管理员</h1>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        {!allowPublicRegistration && <p className="text-gray-600 mb-2">当前已关闭公开注册</p>}
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
        <button className="w-full bg-blue-500 text-white p-2 rounded mb-2 hover:bg-blue-600 active:bg-blue-700 transition" onClick={register} disabled={!allowPublicRegistration}>
          注册并进入
        </button>
        <button className="w-full text-blue-500 text-sm hover:underline" onClick={() => router.push('/login')}>
          返回登录
        </button>
      </div>
    </div>
  );
}
