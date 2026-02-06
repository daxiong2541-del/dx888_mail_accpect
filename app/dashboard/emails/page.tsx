'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

type EmailConfig = {
  _id: string;
  targetEmail: string;
  password?: string;
  shareType?: 'json' | 'html';
  durationDays: number;
  maxCount: number;
  receivedCount: number;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function EmailsDashboardPage() {
  const [userId, setUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [orderBy, setOrderBy] = useState<'createdAt' | 'updatedAt'>('updatedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkShareType, setBulkShareType] = useState<'json' | 'html'>('html');

  const baseUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.origin;
  }, []);

  useEffect(() => {
    const uid = localStorage.getItem('userId') || '';
    setUserId(uid);
    setIsAdmin(localStorage.getItem('isAdmin') === 'true');
  }, []);

  const load = async () => {
    if (!userId) return;
    const qs = new URLSearchParams({
      userId,
      page: String(page),
      pageSize: String(pageSize),
    });
    if (query) qs.set('q', query);
    qs.set('orderBy', orderBy);
    qs.set('order', order);
    if (createdFrom) qs.set('createdFrom', createdFrom);
    if (createdTo) qs.set('createdTo', createdTo);
    const res = await axios.get(`/api/emails?${qs.toString()}`);
    setConfigs(res.data.configs);
    setTotal(Number(res.data.total || 0));
    setSelectedIds({});
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, page, pageSize, query, orderBy, order, createdFrom, createdTo]);

  const formatRemainingTime = (expiresAt: string) => {
    const end = new Date(expiresAt).getTime();
    const diff = end - Date.now();
    if (diff <= 0) return '已过期';
    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;
    if (days > 0) return `${days}天${hours}小时`;
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
  };

  const [importRaw, setImportRaw] = useState('');
  const [importDurationDays, setImportDurationDays] = useState(1);
  const [importMaxCount, setImportMaxCount] = useState(100);
  const [importShareType, setImportShareType] = useState<'json' | 'html'>('html');
  const [importSkipped, setImportSkipped] = useState<string[]>([]);

  const submitImport = async () => {
    try {
      setBusy(true);
      setError('');
      const res = await axios.post('/api/emails', {
        userId,
        mode: 'import',
        rawEmails: importRaw,
        durationDays: importDurationDays,
        maxCount: importMaxCount,
        shareType: importShareType,
      });
      setImportRaw('');
      setImportSkipped(Array.isArray(res.data.skippedEmails) ? res.data.skippedEmails : []);
      await load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { error?: string } | undefined)?.error || '导入失败');
      } else {
        setError('导入失败');
      }
    } finally {
      setBusy(false);
    }
  };

  const [genCount, setGenCount] = useState(10);
  const [genCharLength, setGenCharLength] = useState(8);
  const [genCharType, setGenCharType] = useState<'number' | 'english'>('english');
  const [genPrefix, setGenPrefix] = useState('');
  const [genDurationDays, setGenDurationDays] = useState(1);
  const [genMaxCount, setGenMaxCount] = useState(100);
  const [genShareType, setGenShareType] = useState<'json' | 'html'>('html');

  const submitGenerate = async () => {
    try {
      setBusy(true);
      setError('');
      await axios.post('/api/emails', {
        userId,
        mode: 'generate',
        count: genCount,
        charLength: genCharLength,
        charType: genCharType,
        prefix: genPrefix,
        durationDays: genDurationDays,
        maxCount: genMaxCount,
        shareType: genShareType,
      });
      await load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { error?: string } | undefined)?.error || '生成失败');
      } else {
        setError('生成失败');
      }
    } finally {
      setBusy(false);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editDurationDays, setEditDurationDays] = useState(1);
  const [editMaxCount, setEditMaxCount] = useState(100);
  const [editShareType, setEditShareType] = useState<'json' | 'html'>('html');

  const startEdit = (cfg: EmailConfig) => {
    setEditingId(cfg._id);
    setEditPassword(String(cfg.password || ''));
    setEditDurationDays(Number(cfg.durationDays || 1));
    setEditMaxCount(Number(cfg.maxCount || 100));
    setEditShareType(cfg.shareType === 'json' ? 'json' : 'html');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (cfgId: string, resetCounts: boolean) => {
    try {
      setBusy(true);
      setError('');
      await axios.patch(`/api/emails/config/${cfgId}`, {
        userId,
        password: editPassword,
        durationDays: editDurationDays,
        maxCount: editMaxCount,
        shareType: editShareType,
        resetCounts,
      });
      setEditingId(null);
      await load();
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

  const deleteRow = async (cfgId: string) => {
    if (!confirm('确认删除该邮箱记录？')) return;
    try {
      setBusy(true);
      setError('');
      await axios.delete(`/api/emails/config/${cfgId}?userId=${userId}`);
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

  const allIds = useMemo(() => configs.map((c) => c._id).filter(Boolean), [configs]);
  const selectedCount = useMemo(
    () => Object.values(selectedIds).filter(Boolean).length,
    [selectedIds]
  );
  const allSelected = useMemo(
    () => allIds.length > 0 && allIds.every((id) => selectedIds[id]),
    [allIds, selectedIds]
  );

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const id of allIds) next[id] = true;
    setSelectedIds(next);
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const bulkDelete = async () => {
    const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (ids.length === 0) return;
    if (!confirm(`确认删除选中的 ${ids.length} 条邮箱记录？`)) return;
    try {
      setBusy(true);
      setError('');
      await axios.post('/api/emails/bulk-delete', { userId, ids });
      await load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { error?: string } | undefined)?.error || '批量删除失败');
      } else {
        setError('批量删除失败');
      }
    } finally {
      setBusy(false);
    }
  };

  const bulkUpdateShare = async () => {
    const ids = Object.keys(selectedIds).filter((id) => selectedIds[id]);
    if (ids.length === 0) return;
    if (!confirm(`确认将选中的 ${ids.length} 条记录分享类型修改为 ${bulkShareType.toUpperCase()}？`)) return;
    try {
      setBusy(true);
      setError('');
      await axios.post('/api/emails/bulk-update', { userId, ids, shareType: bulkShareType });
      await load();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        setError((e.response?.data as { error?: string } | undefined)?.error || '批量更新失败');
      } else {
        setError('批量更新失败');
      }
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const applySearch = () => {
    const q = queryInput.trim();
    setPage(1);
    setQuery(q);
  };

  const applyFilters = () => {
    setPage(1);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded shadow p-6">
        <h1 className="text-xl font-bold mb-2">邮箱管理</h1>
        <div className="text-sm text-gray-600">数据隔离：每个用户只能看到自己的邮箱数据{isAdmin ? '（管理员可创建用户）' : ''}</div>
        {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded shadow p-6">
          <div className="text-lg font-bold mb-3">批量导入邮箱</div>
          <textarea
            className="w-full border rounded p-2 h-36"
            placeholder="每行一个邮箱，或用逗号/空格分隔（仅支持 @dynmsl.com）"
            value={importRaw}
            onChange={(e) => setImportRaw(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <input
              className="border rounded p-2"
              type="number"
              placeholder="接收时长(天)"
              value={importDurationDays}
              onChange={(e) => setImportDurationDays(Number(e.target.value))}
            />
            <input
              className="border rounded p-2"
              type="number"
              placeholder="接收次数"
              value={importMaxCount}
              onChange={(e) => setImportMaxCount(Number(e.target.value))}
            />
            <select
              className="border rounded p-2"
              value={importShareType}
              onChange={(e) => setImportShareType(e.target.value === 'json' ? 'json' : 'html')}
            >
              <option value="html">分享：HTML</option>
              <option value="json">分享：JSON</option>
            </select>
          </div>
          <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 active:bg-green-800 transition" onClick={submitImport} disabled={busy}>
            导入
          </button>
          {importSkipped.length > 0 && (
            <div className="mt-3 text-sm text-orange-700">
              检测到重复邮箱已跳过：{importSkipped.slice(0, 10).join('、')}
              {importSkipped.length > 10 ? ` 等 ${importSkipped.length} 个` : ''}
            </div>
          )}
        </div>

        <div className="bg-white rounded shadow p-6">
          <div className="text-lg font-bold mb-3">批量注册邮箱</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2 text-xs text-gray-600">
            <div>数量</div>
            <div>字符长度</div>
            <div>类型</div>
            <div>前缀</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              className="border rounded p-2"
              type="number"
              placeholder="数量(<=100)"
              value={genCount}
              onChange={(e) => setGenCount(Number(e.target.value))}
            />
            <input
              className="border rounded p-2"
              type="number"
              placeholder="字符长度(4-20)"
              value={genCharLength}
              onChange={(e) => setGenCharLength(Number(e.target.value))}
            />
            <select
              className="border rounded p-2"
              value={genCharType}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'english' || v === 'number') setGenCharType(v);
              }}
            >
              <option value="english">英文字母</option>
              <option value="number">纯数字</option>
            </select>
            <input
              className="border rounded p-2"
              placeholder="前缀(可选)"
              value={genPrefix}
              onChange={(e) => setGenPrefix(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 mb-2 text-xs text-gray-600">
            <div>接收时长(天)</div>
            <div>接收次数</div>
            <div>分享类型</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <input
              className="border rounded p-2"
              type="number"
              placeholder="接收时长(天)"
              value={genDurationDays}
              onChange={(e) => setGenDurationDays(Number(e.target.value))}
            />
            <input
              className="border rounded p-2"
              type="number"
              placeholder="接收次数"
              value={genMaxCount}
              onChange={(e) => setGenMaxCount(Number(e.target.value))}
            />
            <select
              className="border rounded p-2"
              value={genShareType}
              onChange={(e) => setGenShareType(e.target.value === 'json' ? 'json' : 'html')}
            >
              <option value="html">分享：HTML</option>
              <option value="json">分享：JSON</option>
            </select>
          </div>
          <button className="mt-4 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 active:bg-purple-800 transition" onClick={submitGenerate} disabled={busy}>
            生成并注册
          </button>
          <div className="text-xs text-gray-500 mt-2">需要正确配置 `DYNMSL_API_TOKEN` 才能注册成功</div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">邮箱列表</h2>
          <div className="flex gap-3">
            <button className="text-blue-600 text-sm hover:underline" onClick={load} disabled={busy}>
              刷新
            </button>
            <button className="text-gray-800 text-sm" onClick={() => window.open(`/api/export/emails?userId=${userId}`, '_blank')}>
              导出 CSV
            </button>
            <select
              className="border rounded px-2 text-sm"
              value={bulkShareType}
              onChange={(e) => setBulkShareType(e.target.value === 'json' ? 'json' : 'html')}
              disabled={busy}
            >
              <option value="html">批量改分享: HTML</option>
              <option value="json">批量改分享: JSON</option>
            </select>
            <button
              className={`text-sm ${selectedCount > 0 ? 'text-blue-700 hover:underline' : 'text-gray-400'}`}
              onClick={bulkUpdateShare}
              disabled={busy || selectedCount === 0}
            >
              批量更新分享{selectedCount > 0 ? `(${selectedCount})` : ''}
            </button>
            <button
              className={`text-sm ${selectedCount > 0 ? 'text-red-700 hover:underline' : 'text-gray-400'}`}
              onClick={bulkDelete}
              disabled={busy || selectedCount === 0}
            >
              批量删除{selectedCount > 0 ? `(${selectedCount})` : ''}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <input
              className="border rounded p-2 text-sm w-64"
              placeholder="搜索邮箱（模糊匹配）"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearch();
              }}
              disabled={busy}
            />
            <button className="bg-gray-800 text-white px-3 py-2 rounded text-sm hover:bg-black active:bg-gray-900 transition" onClick={applySearch} disabled={busy}>
              搜索
            </button>
            {query && (
              <button
                className="text-sm text-gray-700"
                onClick={() => {
                  setQueryInput('');
                  setQuery('');
                  setPage(1);
                }}
                disabled={busy}
              >
                清除
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-700">创建时间</span>
            <input
              className="border rounded px-2 py-1"
              type="date"
              value={createdFrom}
              onChange={(e) => setCreatedFrom(e.target.value)}
              disabled={busy}
            />
            <span className="text-gray-500">-</span>
            <input
              className="border rounded px-2 py-1"
              type="date"
              value={createdTo}
              onChange={(e) => setCreatedTo(e.target.value)}
              disabled={busy}
            />
            <select className="border rounded px-2 py-1" value={orderBy} onChange={(e) => setOrderBy(e.target.value === 'createdAt' ? 'createdAt' : 'updatedAt')} disabled={busy}>
              <option value="updatedAt">按更新时间</option>
              <option value="createdAt">按创建时间</option>
            </select>
            <select className="border rounded px-2 py-1" value={order} onChange={(e) => setOrder(e.target.value === 'asc' ? 'asc' : 'desc')} disabled={busy}>
              <option value="desc">倒序</option>
              <option value="asc">升序</option>
            </select>
            <button className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 active:bg-blue-800 transition" onClick={applyFilters} disabled={busy}>
              应用
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>每页</span>
            <select
              className="border rounded px-2 py-1"
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(e.target.value));
              }}
              disabled={busy}
            >
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
            <span>条</span>
            <span className="text-gray-500">共 {total} 条</span>
            <button className="text-blue-700 hover:underline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={busy || !canPrev}>
              上一页
            </button>
            <span className="text-gray-500">
              {page} / {totalPages}
            </span>
            <button className="text-blue-700 hover:underline" onClick={() => setPage((p) => p + 1)} disabled={busy || !canNext}>
              下一页
            </button>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border p-2 text-left">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="border p-2 text-left">邮箱</th>
                <th className="border p-2 text-left">密码</th>
                <th className="border p-2 text-left">分享链接</th>
                <th className="border p-2 text-left">剩余接收次数</th>
                <th className="border p-2 text-left">剩余接收时间</th>
                <th className="border p-2 text-left">创建时间</th>
                <th className="border p-2 text-left">更新时间</th>
                <th className="border p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((cfg) => {
                const remaining = cfg.maxCount - cfg.receivedCount;
                const t = cfg.shareType === 'json' ? 'json' : 'html';
                const href =
                  t === 'json'
                    ? `${baseUrl}/api/share/email/${cfg._id}`
                    : `${baseUrl}/share/email/${cfg._id}`;
                const isEditing = editingId === cfg._id;
                return (
                  <tr key={cfg._id}>
                    <td className="border p-2">
                      <input type="checkbox" checked={Boolean(selectedIds[cfg._id])} onChange={() => toggleOne(cfg._id)} />
                    </td>
                    <td className="border p-2">{cfg.targetEmail}</td>
                    <td className="border p-2 font-mono">{cfg.password || '-'}</td>
                    <td className="border p-2">
                      {cfg._id ? (
                        <a className="text-blue-600 underline" href={href} target="_blank" rel="noreferrer">
                          打开
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="border p-2">{remaining}</td>
                    <td className="border p-2">{formatRemainingTime(cfg.expiresAt)}</td>
                    <td className="border p-2">{cfg.createdAt ? new Date(cfg.createdAt).toLocaleString() : '-'}</td>
                    <td className="border p-2">{cfg.updatedAt ? new Date(cfg.updatedAt).toLocaleString() : '-'}</td>
                    <td className="border p-2">
                      {isEditing ? (
                        <div className="space-y-2">
                          <div className="flex gap-2 flex-wrap">
                            <input
                              className="border rounded p-1 w-28"
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder="密码"
                            />
                            <input
                              className="border rounded p-1 w-20"
                              type="number"
                              value={editDurationDays}
                              onChange={(e) => setEditDurationDays(Number(e.target.value))}
                              placeholder="天数"
                            />
                            <input
                              className="border rounded p-1 w-24"
                              type="number"
                              value={editMaxCount}
                              onChange={(e) => setEditMaxCount(Number(e.target.value))}
                              placeholder="次数"
                            />
                            <select
                              className="border rounded p-1"
                              value={editShareType}
                              onChange={(e) => setEditShareType(e.target.value === 'json' ? 'json' : 'html')}
                            >
                              <option value="html">HTML</option>
                              <option value="json">JSON</option>
                            </select>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                              onClick={() => saveEdit(cfg._id, false)}
                              disabled={busy}
                            >
                              保存
                            </button>
                            <button
                              className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                              onClick={() => saveEdit(cfg._id, true)}
                              disabled={busy}
                            >
                              保存并重置次数
                            </button>
                            <button className="text-gray-700 px-2 py-1 rounded text-xs" onClick={cancelEdit} disabled={busy}>
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                        <button className="text-blue-600 text-xs hover:underline" onClick={() => startEdit(cfg)} disabled={busy}>
                            编辑
                          </button>
                        <button className="text-red-600 text-xs hover:underline" onClick={() => deleteRow(cfg._id)} disabled={busy}>
                            删除
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
