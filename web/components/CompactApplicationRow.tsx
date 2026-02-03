'use client'

import { useState } from 'react'
import { ApplicationWithJob, ApplicationStatus, RequiredDocuments } from '@/types/application'
import { StatusBadge } from './StatusBadge'
import { DeadlineBadge } from './DeadlineBadge'
import { ApplicationCard } from './ApplicationCard'
import { Pin, ChevronDown, ChevronUp } from 'lucide-react'

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
  const { saved_job } = application

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* 컴팩트 행 */}
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* 핀 */}
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin(saved_job.id)
            }}
            className={`flex-shrink-0 p-1 rounded ${isPinned ? 'text-blue-600' : 'text-gray-300 hover:text-gray-500'}`}
            title={isPinned ? '고정 해제' : '상위 고정'}
          >
            <Pin className="w-3.5 h-3.5" style={isPinned ? { fill: 'currentColor' } : {}} />
          </button>
        )}

        {/* 회사명 */}
        <span className="flex-shrink-0 w-24 text-sm font-medium text-gray-900 truncate">
          {saved_job.company}
        </span>

        {/* 공고명 */}
        <span className="flex-1 text-sm text-gray-600 truncate min-w-0">
          {saved_job.title}
        </span>

        {/* 상태 */}
        <StatusBadge status={application.status} />

        {/* 마감일 */}
        <div className="flex-shrink-0">
          <DeadlineBadge deadline={saved_job.deadline} />
        </div>

        {/* 적합도 */}
        {saved_job.score && (
          <span className="flex-shrink-0 text-xs font-medium text-blue-600 w-10 text-right">
            {saved_job.score}점
          </span>
        )}

        {/* 확장 아이콘 */}
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* 확장 시 전체 카드 */}
      {expanded && (
        <div className="border-t border-gray-200 p-3">
          <ApplicationCard
            application={application}
            onStatusChange={onStatusChange}
            onUpdateNotes={onUpdateNotes}
            onUpdateDocuments={onUpdateDocuments}
            onUpdateDeadline={onUpdateDeadline}
            onDelete={onDelete}
            isPinned={isPinned}
            onTogglePin={onTogglePin}
          />
        </div>
      )}
    </div>
  )
}
