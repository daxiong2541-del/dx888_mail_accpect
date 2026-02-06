'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      router.replace('/login');
      return;
    }
    axios
      .get(`/api/auth/me?userId=${userId}`)
      .then((res) => {
        setUsername(res.data.user.username);
        setIsAdmin(Boolean(res.data.user.isAdmin));
        localStorage.setItem('isAdmin', String(Boolean(res.data.user.isAdmin)));
      })
      .catch(() => {
        localStorage.removeItem('userId');
        router.replace('/login');
      });
  }, [router]);

  const logout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    router.replace('/login');
  };

  const navItem = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`block px-3 py-2 rounded ${active ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <div className="max-w-6xl mx-auto flex gap-6 p-6">
        <aside className="w-64 shrink-0 bg-white rounded shadow p-4 h-fit">
          <div className="text-lg font-bold mb-2">后台管理</div>
          <div className="text-xs text-gray-500 mb-4">
            {username || '...'} {isAdmin ? '(管理员)' : ''}
          </div>
          <nav className="space-y-1">
            {navItem('/dashboard/emails', '邮箱管理')}
            {isAdmin && navItem('/dashboard/users', '用户管理')}
            {isAdmin && navItem('/dashboard/settings', '系统设置')}
          </nav>
          <button onClick={logout} className="mt-6 text-red-600 text-sm">
            退出登录
          </button>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
