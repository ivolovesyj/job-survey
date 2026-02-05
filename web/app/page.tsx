'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
import { Briefcase, Search, AlertTriangle, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'

const LOADING_MESSAGES = [
  '지원함이 열심히 정리 중!',
  '당신의 지원함을 채우는 중...',
  '합격의 기운을 수집 중...',
  '지원함 싹- 모으는 중!',
  '내 지원함 착착 정리 중!',
  '소중한 기회를 담는 중...',
]

const getRandomLoadingMessage = () => {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
}

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

// 비로그인 사용자를 위한 샘플 데이터
const SAMPLE_APPLICATIONS = [
  { id: 'sample-1', company: '토스', title: '프론트엔드 개발자', location: '서울', deadline: '2024-03-31', status: 'pending', link: '#' },
  { id: 'sample-2', company: '카카오', title: 'React 개발자', location: '판교', deadline: '2024-03-25', status: 'hold', link: '#' },
  { id: 'sample-3', company: '네이버', title: '웹 프론트엔드 개발', location: '성남', deadline: '2024-04-05', status: 'applied', link: '#' },
]

export default function HomePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all')
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0])
  const initialLoadStartRef = useRef<number | null>(null)
  const [minLoadingComplete, setMinLoadingComplete] = useState(false)
  const [showHeroBanner, setShowHeroBanner] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Phase 1: 검색, 정렬, 뷰 모드
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [viewMode, setViewMode] = useState<ViewMode>('compact')

  // Phase 2: 핀 상태 + 순서
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [pinOrder, setPinOrder] = useState<string[]>([])

  // Phase 3: 외부 공고 모달
  const [showExternalModal, setShowExternalModal] = useState(false)

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true)
    setLoadingMessage(getRandomLoadingMessage())
    initialLoadStartRef.current = Date.now()
  }, [])

  // 최소 로딩 시간 보장 (1초)
  useEffect(() => {
    if (!initialLoadStartRef.current) return

    const minLoadingTime = 1000
    const elapsed = Date.now() - initialLoadStartRef.current
    const remaining = Math.max(0, minLoadingTime - elapsed)

    const timer = setTimeout(() => {
      setMinLoadingComplete(true)
    }, remaining)

    return () => clearTimeout(timer)
  }, [mounted])

  useEffect(() => {
    if (!authLoading && user) {
      fetchApplications()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading])

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

  const handleStatusChange = async (applicationId: string, newStatus: ApplicationStatus) => {
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
        .update({ deadline: deadline || null })
        .eq('id', savedJobId)

      if (error) throw error

      setApplications((prev) =>
        prev.map((app) =>
          app.saved_job.id === savedJobId
            ? { ...app, saved_job: { ...app.saved_job, deadline: deadline || null } }
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

  // 로딩 화면
  if (!minLoadingComplete || authLoading || loading || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto animate-bounce">
            <Image src="/logo-final.png" alt="지원함" width={96} height={96} className="w-full h-full object-contain" />
          </div>
          <p className="mt-4 text-lg font-medium text-gray-700">{loadingMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navigation />

      {/* 히어로 배너 (비로그인 사용자에게만 표시) */}
      {!user && showHeroBanner && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 border-b px-4 py-3 relative">
          <div className="max-w-md mx-auto flex items-center justify-between gap-3">
            <div className="flex-1 text-left">
              <h2 className="text-base font-bold text-white leading-tight">
                지원한 곳 헷갈릴 땐? 지원함
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                메모장·노션은 이제 끝. 수동 입력 없이 자동으로 관리하세요.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/login">
                <button className="px-3 py-1.5 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition text-xs whitespace-nowrap">
                  시작하기
                </button>
              </Link>
              <button
                onClick={() => setShowHeroBanner(false)}
                className="p-1 hover:bg-white/10 rounded transition"
                aria-label="배너 닫기"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">지원 관리</h2>
            <div className="text-sm text-gray-600">
              총 {applications.length}개
            </div>
          </div>

          {!user ? (
            // 비로그인 상태 - 샘플 데이터로 구조 미리보기
            <div className="relative min-h-[500px]">
              <div className="grid gap-4">
                {SAMPLE_APPLICATIONS.map((app) => (
                  <div key={app.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition opacity-60">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900">{app.company}</h3>
                        <p className="text-gray-700 mt-1">{app.title}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                          <span>{app.location}</span>
                          {app.deadline && <span>마감: {new Date(app.deadline).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          app.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                          app.status === 'passed' ? 'bg-red-100 text-red-700' :
                          app.status === 'hold' ? 'bg-gray-100 text-gray-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {app.status === 'pending' ? '지원 예정' :
                           app.status === 'passed' ? '지원 안 함' :
                           app.status === 'hold' ? '보류' : '지원 완료'}
                        </span>
                        <Button variant="outline" size="sm">원문 보기</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 오버레이 */}
              <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center z-10">
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md mx-4 text-center">
                  <div className="w-16 h-16 mb-4 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <Briefcase className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    지원 관리를 시작하세요
                  </h3>
                  <p className="text-gray-600 mb-6">
                    채용 공고를 둘러보거나, 다른 사이트에서 지원한 내역을 추가해보세요
                  </p>
                  <div className="flex flex-col gap-3">
                    <Link href="/jobs" className="w-full">
                      <Button size="lg" className="w-full flex items-center justify-center gap-2">
                        <Search className="w-5 h-5" />
                        채용공고 보러가기
                      </Button>
                    </Link>
                    <Link href="/login" className="w-full">
                      <Button size="lg" variant="outline" className="w-full flex items-center justify-center gap-2">
                        지원 내역 추가하기
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : applications.length === 0 ? (
            // 로그인했지만 지원 내역 없음
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                아직 지원한 공고가 없어요
              </h3>
              <p className="text-gray-600 mb-8 max-w-md">
                채용공고 페이지에서 관심있는 공고를 찾아 지원하거나,<br />
                다른 사이트에서 지원한 내역을 직접 추가해보세요
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/jobs">
                  <Button size="lg" className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    채용공고 보러가기
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowExternalModal(true)}
                  className="flex items-center gap-2"
                >
                  지원 내역 직접 추가
                </Button>
              </div>
            </div>
          ) : (
            // 지원 관리 전체 기능
            <>
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

              {/* 필터 탭 */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                <div className="flex flex-wrap gap-2">
                  {filterButtons.map(({ key, label }) => {
                    const count = statusCounts[key] || 0
                    const alwaysShow = ['all', 'pending', 'applied', 'document_pass', 'interviewing', 'accepted'].includes(key)
                    if (!alwaysShow && count === 0) return null
                    return (
                      <Button
                        key={key}
                        size="sm"
                        variant={filter === key ? 'default' : 'outline'}
                        onClick={() => setFilter(key)}
                        className={count === 0 ? 'opacity-50' : ''}
                      >
                        {label} ({count})
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* 공고 목록 */}
              {processedApplications.length === 0 && pinnedApplications.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                  <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchQuery
                      ? `"${searchQuery}" 검색 결과가 없습니다`
                      : filter === 'all'
                        ? '아직 지원한 공고가 없어요'
                        : '해당 상태의 공고가 없습니다'}
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    채용공고 페이지에서 관심있는 공고를 찾아 지원하거나,<br/>
                    다른 사이트에서 지원한 내역을 직접 추가해보세요
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Link href="/jobs">
                      <Button className="gap-2">
                        <Briefcase className="w-4 h-4" />
                        채용공고 보러가기
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowExternalModal(true)}
                      className="gap-2"
                    >
                      지원 내역 직접 추가
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 핀 고정 섹션 */}
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

                  {/* 구분선 */}
                  {pinnedApplications.length > 0 && processedApplications.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className="flex-1 border-t border-gray-200" />
                      <span className="text-xs text-gray-400">일반</span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>
                  )}

                  {/* 일반 공고 목록 */}
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
            </>
          )}
        </div>
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
