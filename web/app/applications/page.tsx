'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ApplicationWithJob, ApplicationStatus, RequiredDocuments } from '@/types/application'
import { ApplicationCard } from '@/components/ApplicationCard'
import { CompactApplicationRow } from '@/components/CompactApplicationRow'
import { PinnedSection } from '@/components/PinnedSection'
import { AddExternalJobModal } from '@/components/AddExternalJobModal'
import { ApplicationToolbar, SortKey, ViewMode } from '@/components/ApplicationToolbar'
import { getDeadlineSortValue } from '@/components/DeadlineBadge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { ArrowLeft, Briefcase, LogOut, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

// 상태 정렬 우선순위 (숫자가 작을수록 상위)
const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  hold: 1,
  applied: 2,
  document_pass: 3,
  interviewing: 4,
  final: 5,
  accepted: 6,
  not_applying: 7,
  passed: 8,
  rejected: 9,
  declined: 10,
}

export default function ApplicationsPage() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all')

  // Phase 1: 검색, 정렬, 뷰 모드
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [viewMode, setViewMode] = useState<ViewMode>('card')

  // Phase 2: 핀 상태 + 순서
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [pinOrder, setPinOrder] = useState<string[]>([])

  // Phase 3: 외부 공고 모달
  const [showExternalModal, setShowExternalModal] = useState(false)

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchApplications()
    }
  }, [user])

  const fetchApplications = async () => {
    if (!user) return

    try {
      setLoading(true)

      const { data: savedJobs, error: savedError } = await supabase
        .from('saved_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (savedError) throw savedError

      if (!savedJobs || savedJobs.length === 0) {
        setApplications([])
        return
      }

      const applicationsData: ApplicationWithJob[] = []

      for (const job of savedJobs) {
        let { data: status } = await supabase
          .from('application_status')
          .select('*')
          .eq('user_id', user.id)
          .eq('saved_job_id', job.id)
          .single()

        if (!status) {
          const { data: newStatus, error: createError } = await supabase
            .from('application_status')
            .insert({
              user_id: user.id,
              saved_job_id: job.id,
              status: 'pending',
            })
            .select()
            .single()

          if (createError) {
            console.error('Failed to create status:', createError)
            continue
          }
          status = newStatus
        }

        applicationsData.push({
          ...status,
          saved_job: job,
        })
      }

      // 핀 상태 + 순서 로드
      const pinned = new Set<string>()
      const pinnedJobs: { id: string; pin_order: number }[] = []
      for (const job of savedJobs) {
        if ((job as any).is_pinned) {
          pinned.add(job.id)
          pinnedJobs.push({ id: job.id, pin_order: (job as any).pin_order || 0 })
        }
      }
      setPinnedIds(pinned)
      setPinOrder(pinnedJobs.sort((a, b) => a.pin_order - b.pin_order).map((j) => j.id))

      setApplications(applicationsData)
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (
    applicationId: string,
    newStatus: ApplicationStatus
  ) => {
    try {
      const updateData: any = { status: newStatus }

      if (newStatus === 'applied' && !applications.find((a) => a.id === applicationId)?.applied_date) {
        updateData.applied_date = new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('application_status')
        .update(updateData)
        .eq('id', applicationId)

      if (error) throw error

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId
            ? { ...app, status: newStatus, applied_date: updateData.applied_date || app.applied_date }
            : app
        )
      )
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('상태 변경에 실패했습니다.')
    }
  }

  const handleUpdateNotes = async (applicationId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('application_status')
        .update({ notes })
        .eq('id', applicationId)

      if (error) throw error

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, notes } : app
        )
      )
    } catch (error) {
      console.error('Failed to update notes:', error)
      alert('메모 저장에 실패했습니다.')
    }
  }

  const handleUpdateDocuments = async (applicationId: string, documents: RequiredDocuments) => {
    try {
      const { error } = await supabase
        .from('application_status')
        .update({ required_documents: documents })
        .eq('id', applicationId)

      if (error) throw error

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, required_documents: documents } : app
        )
      )
    } catch (error) {
      console.error('Failed to update documents:', error)
      alert('서류 정보 저장에 실패했습니다.')
    }
  }

  const handleUpdateDeadline = async (savedJobId: string, deadline: string) => {
    try {
      const { error } = await supabase
        .from('saved_jobs')
        .update({ deadline })
        .eq('id', savedJobId)

      if (error) throw error

      setApplications((prev) =>
        prev.map((app) =>
          app.saved_job.id === savedJobId
            ? { ...app, saved_job: { ...app.saved_job, deadline } }
            : app
        )
      )
    } catch (error) {
      console.error('Failed to update deadline:', error)
      alert('마감일 저장에 실패했습니다.')
    }
  }

  const handleDelete = async (applicationId: string, savedJobId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error: statusError } = await supabase
        .from('application_status')
        .delete()
        .eq('id', applicationId)

      if (statusError) throw statusError

      const { error: jobError } = await supabase
        .from('saved_jobs')
        .delete()
        .eq('id', savedJobId)

      if (jobError) throw jobError

      setApplications((prev) => prev.filter((app) => app.id !== applicationId))
      setPinnedIds((prev) => {
        const next = new Set(prev)
        next.delete(savedJobId)
        return next
      })
    } catch (error) {
      console.error('Failed to delete:', error)
      alert('삭제에 실패했습니다.')
    }
  }

  const handleTogglePin = async (savedJobId: string) => {
    const newPinned = new Set(pinnedIds)
    const isPinning = !newPinned.has(savedJobId)

    if (isPinning) {
      newPinned.add(savedJobId)
      setPinOrder((prev) => [...prev, savedJobId])
    } else {
      newPinned.delete(savedJobId)
      setPinOrder((prev) => prev.filter((id) => id !== savedJobId))
    }
    setPinnedIds(newPinned)

    // DB 업데이트
    try {
      await supabase
        .from('saved_jobs')
        .update({ is_pinned: isPinning, pin_order: isPinning ? pinOrder.length : 0 })
        .eq('id', savedJobId)
    } catch {
      // 컬럼 없어도 로컬 상태는 유지
    }
  }

  const handleReorderPins = async (newOrder: string[]) => {
    setPinOrder(newOrder)

    // DB에 순서 저장
    try {
      for (let i = 0; i < newOrder.length; i++) {
        await supabase
          .from('saved_jobs')
          .update({ pin_order: i })
          .eq('id', newOrder[i])
      }
    } catch {
      // 실패해도 로컬 상태는 유지
    }
  }

  const handleSaveExternal = async (data: { company: string; title: string; location: string; deadline: string; link: string; notes: string }) => {
    if (!user) return
    try {
      // saved_jobs에 삽입
      const { data: savedJob, error: saveError } = await supabase
        .from('saved_jobs')
        .insert({
          user_id: user.id,
          job_id: `external_${Date.now()}`,
          source: 'external',
          company: data.company,
          title: data.title,
          location: data.location,
          link: data.link,
          deadline: data.deadline || null,
          is_external: true,
          source_url: data.link,
        })
        .select()
        .single()

      if (saveError) throw saveError

      // application_status 생성
      const { data: status, error: statusError } = await supabase
        .from('application_status')
        .insert({
          user_id: user.id,
          saved_job_id: savedJob.id,
          status: 'pending',
          notes: data.notes || null,
        })
        .select()
        .single()

      if (statusError) throw statusError

      // 로컬 상태 추가
      setApplications((prev) => [
        { ...status, saved_job: savedJob },
        ...prev,
      ])
    } catch (error) {
      console.error('Failed to save external job:', error)
      alert('저장에 실패했습니다.')
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // 필터 → 검색 → 정렬
  const processedApplications = useMemo(() => {
    let result = filter === 'all'
      ? applications
      : applications.filter((app) => app.status === filter)

    // 검색
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((app) =>
        app.saved_job.company.toLowerCase().includes(q) ||
        app.saved_job.title.toLowerCase().includes(q) ||
        (app.saved_job.location || '').toLowerCase().includes(q)
      )
    }

    // 정렬 (핀 제외 - 핀은 별도 섹션)
    const unpinned = result.filter((a) => !pinnedIds.has(a.saved_job.id))

    unpinned.sort((a, b) => {
      switch (sortKey) {
        case 'deadline':
          return getDeadlineSortValue(a.saved_job.deadline) - getDeadlineSortValue(b.saved_job.deadline)
        case 'score':
          return (b.saved_job.score || 0) - (a.saved_job.score || 0)
        case 'company':
          return (a.saved_job.company || '').localeCompare(b.saved_job.company || '', 'ko')
        case 'status':
          return (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
        case 'created_at':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return unpinned
  }, [applications, filter, searchQuery, sortKey, pinnedIds])

  // 핀된 항목 (pinOrder 순서대로)
  const pinnedApplications = useMemo(() => {
    let result = filter === 'all'
      ? applications
      : applications.filter((app) => app.status === filter)

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((app) =>
        app.saved_job.company.toLowerCase().includes(q) ||
        app.saved_job.title.toLowerCase().includes(q) ||
        (app.saved_job.location || '').toLowerCase().includes(q)
      )
    }

    const pinned = result.filter((a) => pinnedIds.has(a.saved_job.id))
    // pinOrder 순서대로 정렬
    return pinned.sort((a, b) => {
      const aIdx = pinOrder.indexOf(a.saved_job.id)
      const bIdx = pinOrder.indexOf(b.saved_job.id)
      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
    })
  }, [applications, filter, searchQuery, pinnedIds, pinOrder])

  // 상태별 카운트
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: applications.length }
    for (const app of applications) {
      counts[app.status] = (counts[app.status] || 0) + 1
    }
    return counts
  }, [applications])

  // 마감 임박 알림
  const urgentCount = useMemo(() => {
    return applications.filter((app) => {
      if (!app.saved_job.deadline) return false
      if (app.status === 'rejected' || app.status === 'accepted' || app.status === 'declined' || app.status === 'passed') return false
      const d = new Date(app.saved_job.deadline)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      d.setHours(0, 0, 0, 0)
      const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diff >= 0 && diff <= 3
    }).length
  }, [applications])

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-gray-600">불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const filterButtons: { key: ApplicationStatus | 'all'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'pending', label: '지원 예정' },
    { key: 'hold', label: '보류' },
    { key: 'applied', label: '지원 완료' },
    { key: 'document_pass', label: '서류 합격' },
    { key: 'interviewing', label: '면접 중' },
    { key: 'accepted', label: '합격' },
    { key: 'not_applying', label: '미지원' },
    { key: 'rejected', label: '불합격' },
    { key: 'passed', label: '지원안함' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-3 md:py-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Image
                  src="/취업하개.png"
                  alt="취업하개"
                  width={32}
                  height={32}
                  className="rounded-full w-8 h-8"
                />
                <h1 className="text-lg md:text-xl font-bold text-gray-900">
                  지원 관리
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">
                총 {applications.length}개
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">로그아웃</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-6">
        {/* 마감 임박 알림 */}
        {urgentCount > 0 && (
          <div
            className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => {
              setFilter('all')
              setSortKey('deadline')
            }}
          >
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span className="text-sm font-medium text-red-700">
              3일 내 마감 {urgentCount}건
            </span>
            <span className="text-xs text-red-500">클릭하면 마감일순 정렬</span>
          </div>
        )}

        {/* 툴바 */}
        <ApplicationToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortKey={sortKey}
          onSortChange={setSortKey}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onAddExternal={() => setShowExternalModal(true)}
        />

        {/* 필터 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {filterButtons.map(({ key, label }) => {
              const count = statusCounts[key] || 0
              if (key !== 'all' && count === 0) return null
              return (
                <Button
                  key={key}
                  size="sm"
                  variant={filter === key ? 'default' : 'outline'}
                  onClick={() => setFilter(key)}
                >
                  {label} ({count})
                </Button>
              )
            })}
          </div>
        </div>

        {/* 공고 목록 */}
        {processedApplications.length === 0 && pinnedApplications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {searchQuery
                ? `"${searchQuery}" 검색 결과가 없습니다.`
                : filter === 'all'
                  ? '저장된 공고가 없습니다.'
                  : '해당 상태의 공고가 없습니다.'}
            </p>
            {!searchQuery && (
              <Link href="/">
                <Button className="mt-4">공고 둘러보기</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* 핀 고정 섹션 (드래그앤드롭) */}
            <PinnedSection
              pinnedApps={pinnedApplications}
              viewMode={viewMode}
              pinnedIds={pinnedIds}
              onReorder={handleReorderPins}
              onStatusChange={handleStatusChange}
              onUpdateNotes={handleUpdateNotes}
              onUpdateDocuments={handleUpdateDocuments}
              onUpdateDeadline={handleUpdateDeadline}
              onDelete={handleDelete}
              onTogglePin={handleTogglePin}
            />

            {/* 나머지 공고 */}
            {pinnedApplications.length > 0 && processedApplications.length > 0 && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">일반</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
            )}

            <div className="space-y-3">
              {viewMode === 'card'
                ? processedApplications.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      onStatusChange={handleStatusChange}
                      onUpdateNotes={handleUpdateNotes}
                      onUpdateDocuments={handleUpdateDocuments}
                      onUpdateDeadline={handleUpdateDeadline}
                      onDelete={handleDelete}
                      isPinned={false}
                      onTogglePin={handleTogglePin}
                    />
                  ))
                : processedApplications.map((application) => (
                    <CompactApplicationRow
                      key={application.id}
                      application={application}
                      onStatusChange={handleStatusChange}
                      onUpdateNotes={handleUpdateNotes}
                      onUpdateDocuments={handleUpdateDocuments}
                      onUpdateDeadline={handleUpdateDeadline}
                      onDelete={handleDelete}
                      isPinned={false}
                      onTogglePin={handleTogglePin}
                    />
                  ))
              }
            </div>
          </>
        )}
      </main>

      {/* 외부 공고 추가 모달 */}
      <AddExternalJobModal
        isOpen={showExternalModal}
        onClose={() => setShowExternalModal(false)}
        onSave={handleSaveExternal}
      />
    </div>
  )
}
