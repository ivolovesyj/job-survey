'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ApplicationStatus } from '@/types/application'
import { ChevronDown } from 'lucide-react'

interface StatusBadgeProps {
  status: ApplicationStatus
  editable?: boolean
  onStatusChange?: (newStatus: ApplicationStatus) => void
}

const statusConfig: Record<
  ApplicationStatus,
  { label: string; shortLabel: string; className: string }
> = {
  passed: {
    label: '지원안함',
    shortLabel: '지원안함',
    className: 'bg-gray-50 text-gray-400 border-gray-200',
  },
  pending: {
    label: '지원 예정',
    shortLabel: '예정',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
  },
  hold: {
    label: '보류',
    shortLabel: '보류',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  not_applying: {
    label: '미지원',
    shortLabel: '미지원',
    className: 'bg-gray-400 text-gray-700 border-gray-500',
  },
  applied: {
    label: '지원 완료',
    shortLabel: '지원완료',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  document_pass: {
    label: '서류 합격',
    shortLabel: '서류합격',
    className: 'bg-green-100 text-green-700 border-green-300',
  },
  interviewing: {
    label: '면접 중',
    shortLabel: '면접중',
    className: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  final: {
    label: '최종 면접',
    shortLabel: '최종',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  },
  rejected: {
    label: '불합격',
    shortLabel: '불합격',
    className: 'bg-red-100 text-red-700 border-red-300',
  },
  accepted: {
    label: '합격',
    shortLabel: '합격',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
  declined: {
    label: '제안 거절',
    shortLabel: '거절',
    className: 'bg-orange-100 text-orange-700 border-orange-300',
  },
}

// 드롭다운에 표시할 상태들 (자주 쓰는 순서)
const STATUS_ORDER: ApplicationStatus[] = [
  'pending',      // 지원 예정
  'applied',      // 지원 완료
  'document_pass', // 서류 합격
  'interviewing', // 면접 중
  'final',        // 최종 면접
  'accepted',     // 합격
  'rejected',     // 불합격
  'hold',         // 보류
  'passed',       // 지원안함
]

export function StatusBadge({ status, editable, onStatusChange }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const config = statusConfig[status]

  // 드롭다운 위치 계산 (뷰포트 기준 fixed)
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      })
    }
  }, [isOpen])

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    // 스크롤 시 닫기
    const handleScroll = () => setIsOpen(false)

    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  // 편집 불가능한 경우 기존 배지만 표시
  if (!editable || !onStatusChange) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border whitespace-nowrap ${config.className}`}
      >
        {config.shortLabel}
      </span>
    )
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap ${config.className}`}
      >
        {config.shortLabel}
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            zIndex: 9999,
          }}
        >
          {STATUS_ORDER.map((s) => {
            const cfg = statusConfig[s]
            const isSelected = s === status
            return (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation()
                  if (s !== status) {
                    onStatusChange(s)
                  }
                  setIsOpen(false)
                }}
                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 flex items-center gap-2 ${
                  isSelected ? 'bg-gray-50 font-medium' : ''
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.className.split(' ')[0]}`} />
                {cfg.label}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
