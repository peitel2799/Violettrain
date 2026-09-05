'use client'

import { useState } from 'react'
import { Search, RefreshCw, Download, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface DataTableColumn {
  key: string
  label: string
  width?: string
  mono?: boolean
  truncate?: boolean
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
}

interface DataTableProps {
  columns: DataTableColumn[]
  data: Record<string, unknown>[]
  loading?: boolean
  page?: number
  pages?: number
  total?: number
  perPage?: number
  searchPlaceholder?: string
  searchValue?: string
  onSearch?: (value: string) => void
  onPageChange?: (page: number) => void
  onRefresh?: () => void
  onEdit?: (row: Record<string, unknown>) => void
  onDelete?: (row: Record<string, unknown>) => void
  onExport?: () => void
  onAdd?: () => void
  addLabel?: string
  extraFilters?: React.ReactNode
  emptyTitle?: string
  emptyDesc?: string
  isAdmin?: boolean
}

function PaginationBar({
  page, pages, total, perPage, onPageChange,
}: {
  page: number; pages: number; total: number; perPage: number
  onPageChange?: (page: number) => void
}) {
  if (pages <= 1) {
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
        <span>
          Hiển thị {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} trong {total}
        </span>
      </div>
    )
  }

  const pages_arr: number[] = []
  const maxVisible = 5
  let start = Math.max(1, page - Math.floor(maxVisible / 2))
  let end = Math.min(pages, start + maxVisible - 1)
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)
  for (let i = start; i <= end; i++) pages_arr.push(i)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span>
        Hiển thị {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} trong {total}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange?.(1)} disabled={page <= 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button onClick={() => onPageChange?.(page - 1)} disabled={page <= 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages_arr.map((p) => (
          <button key={p} onClick={() => onPageChange?.(p)}
            className={cn(
              'w-8 h-8 rounded text-sm font-medium transition-colors',
              p === page ? 'bg-violet-600 text-white' : 'hover:bg-gray-100 text-gray-600'
            )}
          >
            {p}
          </button>
        ))}
        <button onClick={() => onPageChange?.(page + 1)} disabled={page >= pages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => onPageChange?.(pages)} disabled={page >= pages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed">
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function DataTable({
  columns,
  data,
  loading = false,
  page = 1,
  pages = 1,
  total = 0,
  perPage = 50,
  searchPlaceholder = 'Tìm kiếm...',
  searchValue = '',
  onSearch,
  onPageChange,
  onRefresh,
  onEdit,
  onDelete,
  onExport,
  onAdd,
  addLabel = 'Thêm mới',
  extraFilters,
  emptyTitle = 'Không có dữ liệu',
  emptyDesc = 'Bắt đầu bằng cách thêm bản ghi đầu tiên.',
}: DataTableProps) {
  const [localSearch, setLocalSearch] = useState(searchValue)

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value)
    onSearch?.(e.target.value)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={localSearch}
            onChange={handleSearch}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors"
          />
        </div>
        {extraFilters}
        <div className="flex items-center gap-2 ml-auto">
          {onRefresh && (
            <button onClick={onRefresh}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <RefreshCw className="w-4 h-4" /> Làm mới
            </button>
          )}
          {onExport && (
            <button onClick={onExport}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" /> Xuất CSV
            </button>
          )}
          {onEdit && (
            <button onClick={() => onEdit({})}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">{emptyTitle}</p>
            <p className="text-gray-400 text-sm mt-1">{emptyDesc}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                {columns.map((col) => (
                  <th key={col.key}
                    className={cn(
                      'px-4 py-3 font-medium whitespace-nowrap',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                    )}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.label}
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 w-24">
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row, idx) => (
                <tr key={row.id as string ?? idx}
                  className="hover:bg-gray-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key}
                      className={cn(
                        'px-4 py-3 text-gray-700',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.mono && 'font-mono text-xs',
                        col.truncate && 'max-w-xs truncate',
                      )}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : (row[col.key] != null ? String(row[col.key]) : '—')}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {onEdit && (
                          <button onClick={() => onEdit(row)}
                            className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                            title="Sửa">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {onDelete && (
                          <button onClick={() => onDelete(row)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <PaginationBar
          page={page} pages={pages} total={total} perPage={perPage}
          onPageChange={onPageChange}
        />
      )}
    </div>
  )
}
