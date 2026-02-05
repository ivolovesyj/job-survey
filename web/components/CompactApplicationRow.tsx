'use client'

import { useState } from 'react'
import { ApplicationWithJob, ApplicationStatus, RequiredDocuments } from '@/types/application'
import { StatusBadge } from './StatusBadge'
import { DeadlineBadge } from './DeadlineBadge'
import { Button } from '@/components/ui/button'
import { Star, ChevronDown, ChevronUp, ExternalLink, Trash2, MessageSquare } from 'lucide-react'

interface CompactApplicationRowProps {
  application: ApplicationWithJob
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void
  onUpdateNotes: (id: string, notes: string) => void
  onUpdateDocuments: (id: string, documents: RequiredDocuments) => void
  onUpdateDeadline: (savedJobId: string, deadline: string) => void
  onDelete: (applicationId: string, savedJobId: string) => void
  isPinned?: boolean
  onTogglePin?: (savedJobId: string) => void
}

export function CompactApplicationRow({
  application,
  onStatusChange,
  onUpdateNotes,
  onUpdateDocuments,
  onUpdateDeadline,
  onDelete,
  isPinned,
  onTogglePin,
}: CompactApplicationRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState(application.notes || '')
  const { saved_job } = application

  const handleSaveNotes = () => {
    onUpdateNotes(application.id, notes)
    setEditingNotes(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* 컴팩트 행 */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* 별표 고정 */}
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin(saved_job.id)
            }}
            className={`flex-shrink-0 p-0.5 rounded ${isPinned ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
            title={isPinned ? '고정 해제' : '상위 고정'}
          >
            <Star className="w-4 h-4" style={isPinned ? { fill: 'currentColor' } : {}} />
          </button>
        )}

        {/* 회사명 */}
        <span className="flex-shrink-0 w-24 sm:w-32 text-sm font-semibold text-gray-900 truncate">
          {saved_job.company}
        </span>

        {/* 공고명 */}
        <span className="flex-1 text-sm text-gray-600 truncate min-w-0">
          {saved_job.title}
        </span>

        {/* 메모 아이콘 */}
        {application.notes && (
          <MessageSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
        )}

        {/* 위치 - 고정 너비 */}
        <span className="hidden md:block flex-shrink-0 text-xs text-gray-500 w-14 text-right">
          {saved_job.location || '-'}
        </span>

        {/* 상태 - 고정 너비 */}
        <div className="flex-shrink-0 w-[72px] flex justify-end">
          <StatusBadge
            status={application.status}
            editable
            onStatusChange={(newStatus) => onStatusChange(application.id, newStatus)}
          />
        </div>

        {/* 마감일 - 고정 너비 */}
        <div className="hidden sm:flex flex-shrink-0 w-[88px] justify-end">
          <DeadlineBadge
            deadline={saved_job.deadline}
            editable
            onDeadlineChange={(newDeadline) => onUpdateDeadline(saved_job.id, newDeadline)}
          />
        </div>

        {/* 확장 아이콘 */}
        <div className="flex-shrink-0 text-gray-400 ml-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* 확장 시 상세 정보 */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50 space-y-2">
          {/* 액션 버튼 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {saved_job.link && (
                <a
                  href={saved_job.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  원문 보기
                </a>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(application.id, saved_job.id)
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
              title="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 메모 */}
          <div onClick={(e) => e.stopPropagation()}>
            {editingNotes ? (
              <div className="space-y-1">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="메모를 입력하세요..."
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1 min-h-[60px] resize-none"
                />
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleSaveNotes}>
                    저장
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingNotes(false)}>
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
              >
                <MessageSquare className="w-3 h-3" />
                {application.notes ? (
                  <span className="truncate max-w-[200px]">{application.notes}</span>
                ) : (
                  <span className="text-gray-400">메모 추가</span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
