'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, Pencil, Trash2, Shield, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { Modal } from '@/components/admin/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/admin/ui/Badge'
import { ConfirmDialog } from '@/components/admin/ui/Modal'
import { toast, useToast } from '@/components/admin/ui/Toast'
import { listUsers, createUser, updateUser, deleteUser, UserRecord } from '@/lib/admin-data-api'
import { cn } from '@/lib/utils'

const ROLE_CONFIG = {
  admin: { label: 'Quản trị', color: 'bg-amber-100 text-amber-700', icon: Shield },
  editor: { label: 'Nhân viên', color: 'bg-blue-100 text-blue-700', icon: ShieldCheck },
  viewer: { label: 'Chỉ xem', color: 'bg-gray-100 text-gray-600', icon: Eye },
}

function UserModal({ user, onSave, onClose }: {
  user: Partial<UserRecord> | null
  onSave: (data: { username: string; password: string; name: string; email: string; role: string }) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({ username: '', password: '', name: '', email: '', role: 'editor' })
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (user) setForm({ username: user.username || '', password: '', name: user.name || '', email: user.email || '', role: user.role || 'editor' })
  }, [user])

  const handleSave = async () => {
    if (!form.username) { toast('Tên đăng nhập không được để trống', 'error'); return }
    if (!user?.id && !form.password) { toast('Mật khẩu không được để trống', 'error'); return }
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <Modal
      open={!!user}
      onClose={onClose}
      title={user?.id ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}
      size="md"
      footer={<><Button variant="secondary" onClick={onClose} disabled={saving}>Hủy</Button><Button variant="primary" onClick={handleSave} loading={saving}>{user?.id ? 'Lưu' : 'Thêm'}</Button></>}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Tên đăng nhập</label>
          <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
            disabled={!!user?.id}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-400"
            placeholder="e.g. phuong, minh, admin" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Mật khẩu {user?.id && '(để trống nếu không đổi)'}</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder={user?.id ? '••••••••' : 'Nhập mật khẩu'} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Họ tên</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Vai trò</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="admin">Quản trị viên</option>
              <option value="editor">Nhân viên</option>
              <option value="viewer">Chỉ xem</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="user@violette.vn" />
        </div>
      </div>
    </Modal>
  )
}

export default function AdminUsersPage() {
  const { toasts, removeToast } = useToast()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState<Partial<UserRecord> | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const currentUser = localStorage.getItem('admin_user') || 'admin'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listUsers()
      setUsers(data.users || [])
    } catch { toast('Không thể tải danh sách tài khoản', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (form: { username: string; password: string; name: string; email: string; role: string }) => {
    try {
      if (editUser?.id) {
        await updateUser({ id: editUser.id, ...form })
        toast('Cập nhật tài khoản thành công', 'success')
      } else {
        await createUser(form)
        toast('Tạo tài khoản thành công', 'success')
      }
      setEditUser(null)
      load()
    } catch (e) { toast('Lỗi: ' + String(e), 'error') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteUser(deleteTarget.id)
      toast('Đã xóa tài khoản', 'success')
      setDeleteTarget(null)
      load()
    } catch (e) { toast('Lỗi: ' + String(e), 'error') }
    finally { setDeleting(false) }
  }

  const fmtDate = (d: string | null) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleString('vi-VN') } catch { return d }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-serif)' }}>
            Quản lý tài khoản
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Tài khoản đăng nhập cho nhân viên và quản trị viên</p>
        </div>
        <Button variant="primary" onClick={() => setEditUser({})}>
          <Plus className="w-4 h-4" /> Thêm tài khoản
        </Button>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon
          return (
            <div key={key} className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium', cfg.color)}>
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-gray-400">Chưa có tài khoản nào</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Người dùng</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Vai trò</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Đăng nhập cuối</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => {
                const isCurrent = user.username === currentUser
                const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.viewer
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 font-bold text-sm">
                          {user.username?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800 flex items-center gap-2">
                            {user.name || user.username}
                            {isCurrent && <span className="text-xs text-violet-500">(bạn)</span>}
                          </div>
                          <div className="text-xs text-gray-400">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{user.email || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', cfg.color)}>
                        {cfg.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(user.lastLogin)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', user.active ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>
                        {user.active ? 'Hoạt động' : 'Tắt'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditUser(user)}
                          className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Sửa">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {!isCurrent && (
                          <button onClick={() => setDeleteTarget(user)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <UserModal user={editUser} onSave={handleSave} onClose={() => setEditUser(null)} />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa tài khoản?"
        message={`Xóa tài khoản "${deleteTarget?.name || deleteTarget?.username}"? Không thể hoàn tác.`}
        confirmLabel="Xóa" danger loading={deleting}
        onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
