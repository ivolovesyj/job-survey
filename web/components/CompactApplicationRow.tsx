'use client'

import { useState } from 'react'
import { ApplicationWithJob, ApplicationStatus, RequiredDocuments } from '@/types/application'
import { StatusBadge } from './StatusBadge'
import { DeadlineBadge } from './DeadlineBadge'
import { Button } from '@/components/ui/button'
import { Pin, ChevronDown, ChevronUp, ExternalLink, Trash2, MessageSquare, Calendar } from 'lucide-react'

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

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'pending', label: '지원 예정' },
  { value: 'hold', label: '보류' },
  { value: 'applied', label: '지원 완료' },
  { value: 'document_pass', label: '서류 합격' },
  { value: 'interviewing', label: '면접 중' },
  { value: 'final', label: '최종 면접' },
  { value: 'accepted', label: '합격' },
  { value: 'rejected', label: '불합격' },
  { value: 'not_applying', label: '미지원' },
  { value: 'passed', label: '지원안함' },
]

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
  const [editingDeadline, setEditingDeadline] = useState(false)
  const [deadline, setDeadline] = useState(application.saved_job.deadline || '')
  const { saved_job } = application

  const handleSaveNotes = () => {
    onUpdateNotes(application.id, notes)
    setEditingNotes(false)
  }

  const handleSaveDeadline = () => {
    onUpdateDeadline(saved_job.id, deadline)
    setEditingDeadline(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* 컴팩트 행 */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* 핀 */}
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin(saved_job.id)
            }}
            className={`flex-shrink-0 p-0.5 rounded ${isPinned ? 'text-blue-600' : 'text-gray-300 hover:text-gray-500'}`}
            title={isPinned ? '고정 해제' : '상위 고정'}
          >
            <Pin className="w-3 h-3" style={isPinned ? { fill: 'currentColor' } : {}} />
          </button>
        )}

        {/* 회사명 */}
        <span className="flex-shrink-0 w-20 text-xs font-semibold text-gray-900 truncate">
          {saved_job.company}
        </span>

        {/* 공고명 */}
        <span className="flex-1 text-xs text-gray-600 truncate min-w-0">
          {saved_job.title}
        </span>

        {/* 위치 */}
        <span className="hidden sm:block flex-shrink-0 text-xs text-gray-400 w-12 truncate">
          {saved_job.location || '-'}
        </span>

        {/* 상태 */}
        <div className="flex-shrink-0">
          <StatusBadge status={application.status} />
        </div>

        {/* 마감일 */}
        <div className="flex-shrink-0">
          {saved_job.deadline ? (
            <DeadlineBadge deadline={saved_job.deadline} />
          ) : (
            <span className="text-xs text-gray-400">마감일 없음</span>
          )}
        </div>

        {/* 메모 아이콘 */}
        {application.notes && (
          <MessageSquare className="w-3 h-3 text-gray-400 flex-shrink-0" />
        )}

        {/* 확장 아이콘 */}
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* 확장 시 상세 정보 */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50 space-y-2">
          {/* 상단: 상태 변경 + 액션 버튼 */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">상태:</span>
              <select
                value={application.status}
                onChange={(e) => onStatusChange(application.id, e.target.value as ApplicationStatus)}
                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                onClick={(e) => e.stopPropagation()}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              {saved_job.link && (
                <a
                  href={saved_job.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                  title="원문 보기"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
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
          </div>

          {/* 마감일 편집 */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-gray-400" />
            {editingDeadline ? (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-0.5"
                />
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={handleSaveDeadline}>
                  저장
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingDeadline(false)}>
                  취소
                </Button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditingDeadline(true)
                }}
                className="text-xs text-gray-600 hover:text-blue-600"
              >
                {saved_job.deadline ? new Date(saved_job.deadline).toLocaleDateString() : '마감일 설정'}
              </button>
            )}
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

          {/* 추천 이유 */}
          {saved_job.reasons && saved_job.reasons.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {saved_job.reasons.slice(0, 3).map((reason: string, i: number) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
