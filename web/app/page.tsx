'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SwipeCard } from '@/components/SwipeCard'
import { Button } from '@/components/ui/button'
import { RotateCcw, Briefcase, LogOut } from 'lucide-react'
import { Job } from '@/types/job'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [appliedJobs, setAppliedJobs] = useState<Job[]>([])
  const [triggerAction, setTriggerAction] = useState<'pass' | 'hold' | 'apply' | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const offsetRef = useRef(0)

  // 로그인 체크
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) fetchJobs()
  }, [user])

  const fetchJobs = async (append = false) => {
    try {
      if (!append) setLoading(true)
      setError(null)

      // Supabase 세션 토큰을 API에 전달
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const offset = append ? offsetRef.current : 0
      const response = await fetch(`/api/jobs?limit=20&offset=${offset}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.jobs && data.jobs.length > 0) {
        const newJobs: Job[] = data.jobs.map((job: any) => ({
          id: job.id,
          company: job.company,
          company_image: job.company_image,
          title: job.title,
          location: job.location || '위치 미정',
          score: job.score || 0,
          reason: job.reason || '추천 공고',
          reasons: job.reasons || [],
          warnings: job.warnings || [],
          link: job.link,
          source: job.source || 'zighang',
          crawledAt: job.crawledAt,
          detail: job.detail || undefined,
          depth_ones: job.depth_ones,
          depth_twos: job.depth_twos,
          keywords: job.keywords,
          career_min: job.career_min,
          career_max: job.career_max,
          employee_types: job.employee_types,
          deadline_type: job.deadline_type,
          end_date: job.end_date,
          is_new: job.is_new,
        }))

        setHasMore(data.hasMore ?? false)
        offsetRef.current = (data.offset ?? 0) + newJobs.length

        if (append) {
          setJobs(prev => [...prev, ...newJobs])
        } else {
          setJobs(newJobs)
          setCurrentIndex(0)
        }
      } else if (!append) {
        setJobs([])
        setError('새로운 공고가 없습니다.')
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error)
      setError('공고를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'pass' | 'hold' | 'apply') => {
    const currentJob = jobs[currentIndex]

    if (!user) {
      router.push('/login')
      return
    }

    // 즉시 다음 카드로 이동
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)

    try {
      // user_job_actions 테이블에 선택 기록
      await supabase.from('user_job_actions').upsert({
        user_id: user.id,
        job_id: currentJob.id,
        action: action,
        company: currentJob.company,
        job_title: currentJob.title,
        location: currentJob.location,
        keywords: currentJob.reasons || [],
      })

      // 모든 액션을 saved_jobs에 저장 (pass 포함 - 지원관리에서 조회 가능)
      if (action === 'hold' || action === 'apply') {
        setAppliedJobs([...appliedJobs, currentJob])
      }

      const statusMap = { pass: 'passed', hold: 'hold', apply: 'pending' } as const

      const { data: savedJob, error: savedJobError } = await supabase
        .from('saved_jobs')
        .upsert({
          user_id: user.id,
          job_id: currentJob.id,
          source: currentJob.source,
          company: currentJob.company,
          title: currentJob.title,
          location: currentJob.location,
          link: currentJob.link,
          deadline: currentJob.end_date || null,
          score: currentJob.score,
          reason: currentJob.reason,
          reasons: currentJob.reasons || [],
          warnings: currentJob.warnings || [],
          description: currentJob.description,
          detail: currentJob.detail || null,
        })
        .select()
        .single()

      if (savedJobError) {
        console.error('Failed to save job:', savedJobError)
        if (action !== 'pass') {
          alert(`저장 실패: ${savedJobError.message || savedJobError.code || 'Unknown error'}`)
        }
        return
      }

      // application_status 생성/업데이트
      if (savedJob) {
        const { error: statusError } = await supabase
          .from('application_status')
          .upsert({
            user_id: user.id,
            saved_job_id: savedJob.id,
            status: statusMap[action],
          })

        if (statusError) {
          console.error('Failed to save status:', statusError)
        }
      }
    } catch (error) {
      console.error('Failed to save action:', error)
      alert(`저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    }
  }

  const handleReset = () => {
    offsetRef.current = 0
    setAppliedJobs([])
    fetchJobs()
  }

  const handleLoadMore = async () => {
    await fetchJobs(true)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-gray-600">공고를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error && jobs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">😢</div>
          <h1 className="text-2xl font-bold text-gray-900">앗!</h1>
          <p className="text-gray-600">{error}</p>
          <Button onClick={() => fetchJobs()}>다시 시도</Button>
        </div>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">📭</div>
          <h1 className="text-2xl font-bold text-gray-900">공고가 없습니다</h1>
          <p className="text-gray-600">
            크롤러를 실행하여 공고 데이터를 수집해주세요.
          </p>
          <Button onClick={() => fetchJobs()}>새로고침</Button>
        </div>
      </div>
    )
  }

  // 모든 공고를 다 봤을 때
  if (currentIndex >= jobs.length) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="text-6xl">🎉</div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">모든 공고를 확인했어요!</h1>
          <p className="text-gray-600">
            지원 예정 공고: <span className="font-semibold">{appliedJobs.length}개</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto">
              <RotateCcw className="mr-2 h-4 w-4" />
              처음부터 다시 보기
            </Button>
            {hasMore && (
              <Button onClick={handleLoadMore} className="w-full sm:w-auto">
                공고 20개 더 볼게요 📬
              </Button>
            )}
            <Link href="/applications" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full">
                <Briefcase className="mr-2 h-4 w-4" />
                지원 관리 보기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-3 md:py-4 sticky top-0 z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/취업하개.png"
              alt="취업하개"
              width={32}
              height={32}
              className="rounded-full w-8 h-8"
            />
            <h1 className="text-lg md:text-xl font-bold text-gray-900">취업하개</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600">
              {currentIndex + 1} / {jobs.length}
            </div>
            <Link href="/applications">
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                <span className="hidden sm:inline">지원관리</span>
              </Button>
            </Link>
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
      </header>

      {/* 카드 영역 */}
      <main className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="w-full max-w-md min-h-[600px] md:h-[650px] relative">
          {/* 다음 카드 미리보기 */}
          {currentIndex + 1 < jobs.length && (
            <div className="absolute top-4 left-0 right-0 mx-auto w-full opacity-50 scale-95 pointer-events-none">
              <SwipeCard
                job={jobs[currentIndex + 1]}
                onAction={() => {}}
                active={false}
              />
            </div>
          )}

          {/* 현재 카드 */}
          <SwipeCard
            key={jobs[currentIndex].id}
            job={jobs[currentIndex]}
            onAction={handleAction}
            active={true}
            triggerAction={triggerAction}
          />
        </div>
      </main>

      {/* 안내 텍스트 */}
      <div className="text-center pb-4 text-xs text-gray-400">
        버튼을 눌러 선택해주세요
      </div>
    </div>
  )
}
