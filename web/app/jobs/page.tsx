'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Carousel3D } from '@/components/Carousel3D'
import { Button } from '@/components/ui/button'
import { RotateCcw, Briefcase, SlidersHorizontal, X as XIcon, Check, Package } from 'lucide-react'
import { Job } from '@/types/job'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import Image from 'next/image'
import { LoginPromptModal } from '@/components/LoginPromptModal'
import { Navigation } from '@/components/Navigation'

const CAREER_OPTIONS = [
  { value: '신입', label: '신입' },
  { value: '1-3', label: '1~3년' },
  { value: '3-5', label: '3~5년' },
  { value: '5-10', label: '5~10년' },
  { value: '10+', label: '10년+' },
  { value: '경력무관', label: '경력무관' },
]

const LOADING_MESSAGES = [
  '지원함이 열심히 정리 중!',
  '당신의 지원함을 채우는 중...',
  '합격의 기운을 수집 중...',
  '지원함 싹- 모으는 중!',
  '내 지원함 착착 정리 중!',
  '소중한 기회를 담는 중...',
]

// 랜덤 로딩 메시지 선택
const getRandomLoadingMessage = () => {
  return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
}

// 왼쪽 사이드바 필터 (항상 표시)
function FilterSidebar({ filters, options, onSave, user }: {
  filters: UserFilters | null
  options: { depth_ones: string[], regions: string[], employee_types: string[] } | null
  onSave: (f: UserFilters) => void
  user: any
}) {
  const [jobs, setJobs] = useState(filters?.preferred_job_types || [])
  const [regions, setRegions] = useState(filters?.preferred_locations || [])
  const [career, setCareer] = useState(filters?.career_level || '경력무관')
  const [empTypes, setEmpTypes] = useState(filters?.work_style || [])

  // filters 변경 시 로컬 상태 업데이트
  useEffect(() => {
    if (filters) {
      setJobs(filters.preferred_job_types)
      setRegions(filters.preferred_locations)
      setCareer(filters.career_level)
      setEmpTypes(filters.work_style)
    }
  }, [filters])

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item])
  }

  const handleApply = () => {
    const newFilters = { preferred_job_types: jobs, preferred_locations: regions, career_level: career, work_style: empTypes }
    onSave(newFilters)
  }

  const handleReset = () => {
    setJobs([])
    setRegions([])
    setCareer('경력무관')
    setEmpTypes([])
  }

  if (!options) {
    return (
      <div className="hidden lg:block w-72 bg-white border-r p-4">
        <div className="text-sm text-gray-400">필터 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="hidden lg:block w-72 bg-white border-r overflow-y-auto">
      <div className="p-4 space-y-4 sticky top-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">필터</h2>
          <button onClick={handleReset} className="text-xs text-gray-500 hover:text-gray-700">
            초기화
          </button>
        </div>

        {/* 직무 */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">직무</div>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {options.depth_ones.map(d => (
              <button key={d} onClick={() => toggle(jobs, setJobs, d)}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition ${jobs.includes(d) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
              >{d}</button>
            ))}
          </div>
        </div>

        {/* 경력 */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">경력</div>
          <div className="flex flex-col gap-1.5">
            {CAREER_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setCareer(o.value)}
                className={`text-sm px-3 py-2 rounded-lg border transition text-left ${career === o.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
              >{o.label}</button>
            ))}
          </div>
        </div>

        {/* 지역 */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">지역</div>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {options.regions.map(r => (
              <button key={r} onClick={() => toggle(regions, setRegions, r)}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition ${regions.includes(r) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}
              >{r}</button>
            ))}
          </div>
        </div>

        {/* 고용형태 */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">고용형태</div>
          <div className="flex flex-wrap gap-1.5">
            {options.employee_types.map(t => (
              <button key={t} onClick={() => toggle(empTypes, setEmpTypes, t)}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition ${empTypes.includes(t) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'}`}
              >{t}</button>
            ))}
          </div>
        </div>

        {/* 적용 버튼 */}
        <div className="pt-2">
          <Button
            onClick={handleApply}
            disabled={!user || jobs.length === 0}
            className="w-full"
          >
            <Check className="w-4 h-4 mr-2" />
            필터 적용
          </Button>
          {!user && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              로그인 후 필터를 저장할 수 있습니다
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface UserFilters {
  preferred_job_types: string[]
  preferred_locations: string[]
  career_level: string
  work_style: string[]
}

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
  const [filters, setFilters] = useState<UserFilters | null>(null)
  const [filterOptions, setFilterOptions] = useState<{ depth_ones: string[], regions: string[], employee_types: string[] } | null>(null)
  const [checkingOnboarding, setCheckingOnboarding] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loadingMessage] = useState(() => getRandomLoadingMessage())

  // 페이지 로드 시 필터 옵션 로드
  useEffect(() => {
    loadFilterOptions()
  }, [])

  // 로그인된 경우에만 온보딩 체크
  useEffect(() => {
    if (user && !authLoading) {
      setCheckingOnboarding(true)
      checkOnboarding()
    } else if (!authLoading) {
      // 비로그인: 바로 공고 로드
      setCheckingOnboarding(false)
      fetchJobs()
    }
  }, [user, authLoading])

  const checkOnboarding = async () => {
    try {
      // 먼저 user_profiles에서 onboarding_completed 확인
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', user!.id)
        .single()

      if (profileError) {
        console.error('user_profiles 조회 실패:', profileError)
        // DB 에러 발생해도 일단 채용공고 로드 (온보딩 모달은 표시하지 않음)
        setCheckingOnboarding(false)
        fetchJobs() // 채용공고는 로드
        return
      }

      if (!profile || !profile.onboarding_completed) {
        // 온보딩 미완료 → 채용공고만 로드 (온보딩 모달은 표시하지 않음)
        setCheckingOnboarding(false)
        fetchJobs() // 채용공고는 로드
        return
      }

      // user_preferences에서 필터 로드 (있으면)
      const { data, error: prefError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .single()

      if (prefError) {
        console.error('user_preferences 조회 실패:', prefError)
      }

      if (data) {
        setFilters({
          preferred_job_types: data.preferred_job_types || [],
          preferred_locations: data.preferred_locations || [],
          career_level: data.career_level || '경력무관',
          work_style: data.work_style || [],
        })
      }

      setCheckingOnboarding(false)
      fetchJobs()
    } catch (e) {
      console.error('checkOnboarding 에러:', e)
      // 에러 발생해도 일단 채용공고 로드
      setCheckingOnboarding(false)
      fetchJobs()
    }
  }

  const loadFilterOptions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await fetch('/api/filters', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        setFilterOptions(await res.json())
      }
    } catch (error) {
      console.error('Failed to load filter options:', error)
    }
  }

  const fetchJobs = async (append = false) => {
    try {
      if (!append) setLoading(true)
      setError(null)

      // 비로그인 사용자: 토큰 없이 요청
      const { data: { session } } = await supabase.auth.getSession()
      let token = session?.access_token

      const offset = append ? offsetRef.current : 0
      const response = await fetch(`/api/jobs?limit=20&offset=${offset}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        if (response.status === 401 && user) {
          // 로그인 유저만 토큰 갱신 시도
          const { data: refreshed } = await supabase.auth.refreshSession()
          if (refreshed.session?.access_token) {
            const retry = await fetch(`/api/jobs?limit=20&offset=${offset}`, {
              headers: { 'Authorization': `Bearer ${refreshed.session.access_token}` },
            })
            if (retry.ok) {
              const data = await retry.json()
              if (data.jobs?.length > 0) {
                const newJobs: Job[] = data.jobs.map((job: any) => ({
                  id: job.id, company: job.company, company_image: job.company_image,
                  title: job.title, location: job.location || '위치 미정',
                  score: job.score || 0, reason: job.reason || '추천 공고',
                  reasons: job.reasons || [], warnings: job.warnings || [],
                  link: job.link, source: job.source || 'zighang',
                  crawledAt: job.crawledAt, detail: job.detail || undefined,
                  depth_ones: job.depth_ones, depth_twos: job.depth_twos,
                  keywords: job.keywords, career_min: job.career_min,
                  career_max: job.career_max, employee_types: job.employee_types,
                  deadline_type: job.deadline_type, end_date: job.end_date,
                  is_new: job.is_new,
                }))
                setHasMore(data.hasMore ?? false)
                offsetRef.current = (data.offset ?? 0) + newJobs.length
                if (append) setJobs(prev => [...prev, ...newJobs])
                else { setJobs(newJobs); setCurrentIndex(0) }
              }
              return
            }
          }
          await supabase.auth.signOut()
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

  // 실시간 학습: 액션에 따라 keyword_weights, company_preference 업데이트
  const updateLearningData = async (userId: string, job: Job, action: 'pass' | 'hold' | 'apply') => {
    const weightDelta = action === 'apply' ? 2 : action === 'hold' ? 0.5 : -1.5
    const countField = action === 'apply' ? 'apply_count' : action === 'hold' ? 'hold_count' : 'pass_count'

    // 1. 키워드 학습
    const keywords = [
      ...(job.depth_ones || []),
      ...(job.depth_twos || []),
      ...(job.keywords || []),
    ].filter(Boolean)

    for (const keyword of keywords) {
      const { data: existing } = await supabase
        .from('keyword_weights')
        .select('weight, apply_count, hold_count, pass_count')
        .eq('user_id', userId)
        .eq('keyword', keyword)
        .single()

      if (existing) {
        await supabase.from('keyword_weights').update({
          weight: existing.weight + weightDelta,
          [countField]: (existing[countField] || 0) + 1,
        }).eq('user_id', userId).eq('keyword', keyword)
      } else {
        await supabase.from('keyword_weights').insert({
          user_id: userId,
          keyword,
          weight: weightDelta,
          apply_count: action === 'apply' ? 1 : 0,
          hold_count: action === 'hold' ? 1 : 0,
          pass_count: action === 'pass' ? 1 : 0,
        })
      }
    }

    // 2. 회사 선호도 학습
    const companyDelta = action === 'apply' ? 3 : action === 'hold' ? 1 : -2
    const { data: existingCompany } = await supabase
      .from('company_preference')
      .select('preference_score, apply_count, hold_count, pass_count')
      .eq('user_id', userId)
      .eq('company_name', job.company)
      .single()

    if (existingCompany) {
      await supabase.from('company_preference').update({
        preference_score: existingCompany.preference_score + companyDelta,
        [countField]: (existingCompany[countField] || 0) + 1,
      }).eq('user_id', userId).eq('company_name', job.company)
    } else {
      await supabase.from('company_preference').insert({
        user_id: userId,
        company_name: job.company,
        preference_score: companyDelta,
        apply_count: action === 'apply' ? 1 : 0,
        hold_count: action === 'hold' ? 1 : 0,
        pass_count: action === 'pass' ? 1 : 0,
      })
    }
  }

  const handleAction = async (action: 'pass' | 'hold' | 'apply') => {
    const currentJob = jobs[currentIndex]

    // 비로그인 사용자: 로그인 유도
    if (!user) {
      setShowLoginModal(true)
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

      const savedJobData = {
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
      }

      // 기존 saved_job 확인
      const { data: existingSavedJob } = await supabase
        .from('saved_jobs')
        .select('id')
        .eq('user_id', user.id)
        .eq('job_id', currentJob.id)
        .single()

      let savedJob
      let savedJobError

      if (existingSavedJob) {
        // 기존 데이터 있으면 update
        const result = await supabase
          .from('saved_jobs')
          .update(savedJobData)
          .eq('id', existingSavedJob.id)
          .select()
          .single()
        savedJob = result.data
        savedJobError = result.error
      } else {
        // 없으면 insert
        const result = await supabase
          .from('saved_jobs')
          .insert(savedJobData)
          .select()
          .single()
        savedJob = result.data
        savedJobError = result.error
      }

      if (savedJobError) {
        console.error('Failed to save job:', savedJobError)
        if (action !== 'pass') {
          alert(`저장 실패: ${savedJobError.message || savedJobError.code || 'Unknown error'}`)
        }
        return
      }

      // application_status 생성/업데이트
      if (savedJob) {
        // 기존 status 확인
        const { data: existingStatus } = await supabase
          .from('application_status')
          .select('id')
          .eq('user_id', user.id)
          .eq('saved_job_id', savedJob.id)
          .single()

        if (existingStatus) {
          await supabase
            .from('application_status')
            .update({ status: statusMap[action] })
            .eq('id', existingStatus.id)
        } else {
          const { error: statusError } = await supabase
            .from('application_status')
            .insert({
              user_id: user.id,
              saved_job_id: savedJob.id,
              status: statusMap[action],
            })

          if (statusError) {
            console.error('Failed to save status:', statusError)
          }
        }
      }

      // === 실시간 학습: keyword_weights + company_preference 업데이트 ===
      // 백그라운드로 실행 (UI 블로킹 안 함)
      updateLearningData(user.id, currentJob, action).catch(console.error)

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

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      } else if (e.key === 'ArrowRight' && currentIndex < jobs.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, jobs.length])

  // 로딩 화면 (의도적 지연 없음)
  if (authLoading || checkingOnboarding || (loading && jobs.length === 0)) {
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
          {user && (
            <p className="text-gray-600">
              지원 예정 공고: <span className="font-semibold">{appliedJobs.length}개</span>
            </p>
          )}
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
            {user && (
              <Link href="/applications" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full">
                  <Briefcase className="mr-2 h-4 w-4" />
                  지원 관리 보기
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 필터 미설정 체크
  const hasNoFilters = user && filters && (
    !filters.preferred_job_types || filters.preferred_job_types.length === 0
  )

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navigation />

      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽 필터 사이드바 (PC만) */}
        <FilterSidebar
          filters={filters}
          options={filterOptions}
          user={user}
          onSave={async (newFilters) => {
            if (!user) return

            await supabase.from('user_preferences').upsert(
              {
                user_id: user.id,
                preferred_job_types: newFilters.preferred_job_types,
                preferred_locations: newFilters.preferred_locations,
                career_level: newFilters.career_level,
                work_style: newFilters.work_style,
              },
              { onConflict: 'user_id' }
            )
            setFilters(newFilters)
            // 필터 변경 시 공고 새로 불러오기
            offsetRef.current = 0
            setAppliedJobs([])
            fetchJobs()
          }}
        />

        {/* 메인 컨텐츠: 3D 캐러셀 또는 필터 설정 안내 */}
        <main className="flex-1 flex flex-col items-start justify-start p-4 pt-12 relative overflow-hidden">
          {hasNoFilters ? (
            // 필터 미설정 시 안내 메시지
            <div className="w-full max-w-2xl mx-auto mt-20 text-center space-y-6">
              <div className="text-7xl">🎯</div>
              <h2 className="text-3xl font-bold text-gray-900">필터를 설정하고 공고를 받아보세요!</h2>
              <p className="text-lg text-gray-600">
                왼쪽 필터에서 원하는 직무, 경력, 지역을 선택하면<br />
                맞춤형 채용공고를 추천해드립니다.
              </p>
              <div className="pt-4">
                <div className="inline-block px-6 py-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">
                    👈 왼쪽 사이드바에서 필터를 설정해주세요
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // 필터 설정됨: 3D 캐러셀 표시
            <div className="w-full h-full flex items-start justify-center pt-8">
              <Carousel3D
                jobs={jobs}
                currentIndex={currentIndex}
                onAction={handleAction}
                onIndexChange={setCurrentIndex}
              />
            </div>
          )}
        </main>
      </div>

      {/* 로그인 모달 */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  )
}
