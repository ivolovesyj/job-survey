'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { X, Link as LinkIcon, Loader2 } from 'lucide-react'

interface ExternalJobData {
  company: string
  title: string
  location: string
  deadline: string
  link: string
  notes: string
}

interface AddExternalJobModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: ExternalJobData) => void
}

export function AddExternalJobModal({ isOpen, onClose, onSave }: AddExternalJobModalProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<ExternalJobData>({
    company: '',
    title: '',
    location: '',
    deadline: '',
    link: '',
    notes: '',
  })

  const handleFetch = async () => {
    if (!url.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/applications/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const data = await res.json()

      if (res.ok) {
        setForm({
          company: data.company || '',
          title: data.title || '',
          location: data.location || '',
          deadline: data.deadline || '',
          link: data.link || url.trim(),
          notes: '',
        })
      } else {
        alert(data.error || '파싱에 실패했습니다. 수동으로 입력해주세요.')
        setForm((prev) => ({ ...prev, link: url.trim() }))
      }
    } catch {
      alert('요청에 실패했습니다.')
      setForm((prev) => ({ ...prev, link: url.trim() }))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = () => {
    if (!form.company.trim() || !form.title.trim()) {
      alert('회사명과 공고명은 필수입니다.')
      return
    }
    onSave(form)
    // 초기화
    setUrl('')
    setForm({ company: '', title: '', location: '', deadline: '', link: '', notes: '' })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">외부 공고 추가</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* URL 입력 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">공고 URL</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
                />
              </div>
              <Button
                size="sm"
                onClick={handleFetch}
                disabled={loading || !url.trim()}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '불러오기'}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">사람인, 잡코리아, 원티드, 직항 등 지원</p>
          </div>

          {/* 폼 필드 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              회사명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="회사명"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              공고명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="공고 제목"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">위치</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="서울, 판교 등"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">마감일</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="메모 (선택)"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSave}>저장</Button>
        </div>
      </div>
    </div>
  )
}
