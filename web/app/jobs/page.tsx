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
import { FilterModal } from '@/components/FilterModal'

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

// 왼쪽 사이드바 필터 (필터 버튼으로 변경)
function FilterSidebar({ filters, options, onSave, user, isSidebarCollapsed, setIsSidebarCollapsed, onOpenModal }: {
  filters: UserFilters | null
  options: { depth_ones: string[], depth_twos_map: Record<string, string[]>, regions: string[], employee_types: string[], company_types: string[] } | null
  onSave: (f: UserFilters) => void
  user: any
  isSidebarCollapsed: boolean
  setIsSidebarCollapsed: (collapsed: boolean) => void
  onOpenModal: () => void
}) {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)


  // 필터 개수 계산
  const getFilterCount = () => {
    let count = 0
    if (filters?.preferred_job_types?.length) count += filters.preferred_job_types.length
    if (filters?.career_level && filters.career_level !== '경력무관') {
      count += filters.career_level.split(',').filter(Boolean).length
    }
    if (filters?.preferred_locations?.length) count += filters.preferred_locations.length
    if (filters?.work_style?.length) count += filters.work_style.length
    if (filters?.preferred_company_types?.length) count += filters.preferred_company_types.length
    return count
  }

  const filterCount = getFilterCount()

  return (
    <div className={`hidden lg:block bg-white border-r overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? 'w-12' : 'w-80'}`}>
      {isSidebarCollapsed ? (
        // 접힌 상태
        <div className="h-full flex flex-col items-center py-4">
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition relative"
            title="필터 열기"
          >
            <SlidersHorizontal className="w-5 h-5 text-gray-600" />
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      ) : (
        // 펼친 상태
        <div className="p-4 space-y-4">
          <div className="sticky top-0 bg-white pb-2 border-b z-10">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900">필터 선택</h2>
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1 hover:bg-gray-100 rounded transition"
                title="필터 접기"
              >
                <XIcon className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            {!user && (
              <p className="text-xs text-gray-500">
                로그인 후 필터를 저장할 수 있습니다
              </p>
            )}
          </div>

          {/* 필터 버튼 */}
          <button
            onClick={() => {
              if (!user) {
                setShowLoginPrompt(true)
              } else {
                onOpenModal()
              }
            }}
            disabled={!user}
            className={`w-full px-4 py-6 rounded-xl border-2 border-dashed text-center transition ${user
              ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'
              : 'border-gray-200 bg-gray-50 cursor-not-allowed'
              }`}
          >
            <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-sm font-semibold text-gray-900 mb-1">
              {filterCount > 0 ? '필터 변경하기' : '필터 설정하기'}
            </div>
            {filterCount > 0 && (
              <div className="text-xs text-gray-600">
                {filterCount}개 필터 적용 중
              </div>
            )}
            {!user && (
              <div className="text-xs text-gray-500 mt-1">
                로그인이 필요합니다
              </div>
            )}
          </button>

          {/* 현재 적용된 필터 표시 */}
          {filterCount > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-500">현재 적용된 필터</div>

              {filters?.preferred_job_types && filters.preferred_job_types.length > 0 && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">직무</div>
                  <div className="flex flex-wrap gap-1">
                    {filters.preferred_job_types.slice(0, 3).map(job => (
                      <span key={job} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                        {job.replace(/_/g, '·')}
                      </span>
                    ))}
                    {filters.preferred_job_types.length > 3 && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                        +{filters.preferred_job_types.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {filters?.career_level && filters.career_level !== '경력무관' && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">경력</div>
                  <div className="flex flex-wrap gap-1">
                    {filters.career_level.split(',').map(c => (
                      <span key={c} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        {CAREER_OPTIONS.find(o => o.value === c)?.label || c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {filters?.preferred_locations && filters.preferred_locations.length > 0 && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">지역</div>
                  <div className="flex flex-wrap gap-1">
                    {filters.preferred_locations.slice(0, 3).map(loc => (
                      <span key={loc} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {loc}
                      </span>
                    ))}
                    {filters.preferred_locations.length > 3 && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        +{filters.preferred_locations.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {filters?.work_style && filters.work_style.length > 0 && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">고용형태</div>
                  <div className="flex flex-wrap gap-1">
                    {filters.work_style.map(ws => (
                      <span key={ws} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                        {ws}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {filters?.preferred_company_types && filters.preferred_company_types.length > 0 && (
                <div>
                  <div className="text-xs text-gray-600 mb-1">기업 유형</div>
                  <div className="flex flex-wrap gap-1">
                    {filters.preferred_company_types.map(ct => (
                      <span key={ct} className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded">
                        {ct}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 로그인 안내 모달 */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLoginPrompt(false)}>
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">로그인이 필요합니다</h3>
            <p className="text-gray-600 mb-4">필터를 선택하려면 먼저 로그인해주세요.</p>
            <div className="flex gap-2">
              <Button onClick={() => setShowLoginPrompt(false)} variant="outline" className="flex-1">
                닫기
              </Button>
              <Link href="/login" className="flex-1">
                <Button className="w-full">로그인</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface UserFilters {
  preferred_job_types: string[]
  preferred_locations: string[]
  career_level: string
  work_style: string[]
  preferred_company_types?: string[]
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
  const [filterOptions, setFilterOptions] = useState<{ depth_ones: string[], depth_twos_map: Record<string, string[]>, regions: string[], employee_types: string[], company_types: string[] } | null>(null)
  const [checkingOnboarding, setCheckingOnboarding] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0])  // 초기값 고정 (hydration 에러 방지)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)

  // 클라이언트에서만 랜덤 메시지 선택 (hydration 에러 방지)
  useEffect(() => {
    setLoadingMessage(getRandomLoadingMessage())
  }, [])

  // 페이지 로드 시 필터 옵션 로드
  useEffect(() => {
    loadFilterOptions()
  }, [])

  // 로그인된 경우에만 온보딩 체크
  useEffect(() => {
    if (user && !authLoading) {
      // 이미 로드된 공고가 있으면 다시 로드하지 않음
      if (jobs.length > 0) {
        setCheckingOnboarding(false)
        return
      }
      setCheckingOnboarding(true)
      checkOnboarding()
    } else if (!authLoading) {
      // 비로그인: 이미 로드된 공고가 있으면 다시 로드하지 않음
      setCheckingOnboarding(false)
      if (jobs.length === 0) {
        fetchJobs()
      }
    }
  }, [user, authLoading])

  const checkOnboarding = async () => {
    try {
      // 먼저 user_profiles에서 onboarding_completed 확인 (선택적)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('id', user!.id)
        .maybeSingle()  // 행이 없어도 에러 안 남

      // user_preferences에서 필터 로드 (핵심 로직)
      const { data, error: prefError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle()  // 여기도 maybeSingle로 변경

      if (prefError) {
        console.error('user_preferences 조회 실패:', prefError)
      }

      if (data) {
        setFilters({
          preferred_job_types: data.preferred_job_types || [],
          preferred_locations: data.preferred_locations || [],
          career_level: data.career_level || '경력무관',
          work_style: data.work_style || [],
          preferred_company_types: data.preferred_company_types || [],
        })

        // 필터가 있을 때만 공고 로드 (이미 로드된 공고가 없을 때만)
        if (data.preferred_job_types && data.preferred_job_types.length > 0) {
          setCheckingOnboarding(false)
          if (jobs.length === 0) {
            fetchJobs()
          }
        } else {
          // 필터가 없으면 안내 메시지만 표시
          setCheckingOnboarding(false)
          setLoading(false)
        }
      } else {
        // user_preferences가 없으면 안내 메시지만 표시
        setCheckingOnboarding(false)
        setLoading(false)
      }
    } catch (e) {
      console.error('checkOnboarding 에러:', e)
      // 에러 발생 시 안내 메시지 표시
      setCheckingOnboarding(false)
      setLoading(false)
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

      console.log('[fetchJobs] Session:', session ? 'exists' : 'null')
      console.log('[fetchJobs] Token:', token ? 'exists' : 'null')

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
  if (authLoading || checkingOnboarding) {
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

  // 필터 미설정 체크 (jobs.length 체크보다 먼저)
  const hasNoFilters = user && (
    !filters || !filters.preferred_job_types || filters.preferred_job_types.length === 0
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
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
          onOpenModal={() => setShowFilterModal(true)}
          onSave={async (newFilters) => {
            if (!user) return

            // DB에 필터 저장 완료를 기다림
            const { error } = await supabase.from('user_preferences').upsert(
              {
                user_id: user.id,
                preferred_job_types: newFilters.preferred_job_types,
                preferred_locations: newFilters.preferred_locations,
                career_level: newFilters.career_level,
                work_style: newFilters.work_style,
                preferred_company_types: newFilters.preferred_company_types,
              },
              { onConflict: 'user_id' }
            )

            if (error) {
              console.error('Failed to save filters:', error)
              alert('필터 저장에 실패했습니다.')
              return
            }

            // 로컬 상태 업데이트 먼저
            setFilters(newFilters)

            // 필터 변경 시 공고 새로 불러오기 (상태 업데이트 후 약간의 지연)
            offsetRef.current = 0
            setAppliedJobs([])

            // 상태 업데이트가 완료되도록 다음 틱에서 실행
            setTimeout(() => {
              fetchJobs()
            }, 0)
          }}
        />

        {/* 메인 컨텐츠: 3D 캐러셀 또는 필터 설정 안내 */}
        <main className="flex-1 flex flex-col items-start justify-start p-4 pt-12 relative overflow-hidden">
          {hasNoFilters ? (
            // 필터 미설정 시 안내 메시지
            <div className="w-full max-w-2xl mx-auto mt-20 text-center space-y-6">
              <div className="text-7xl">🎯</div>
              <h2 className="text-3xl font-bold text-gray-900">필터를 선택하고<br />맞춤형 공고를 받아보세요!</h2>
              <p className="text-lg text-gray-600">
                왼쪽 필터에서 원하는 직무, 경력, 지역을 선택하면<br />
                나에게 딱 맞는 채용공고를 추천해드립니다.
              </p>
              <div className="pt-4">
                <div className="inline-block px-6 py-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800 font-medium">
                    👈 왼쪽 사이드바에서 필터를 설정해주세요
                  </p>
                </div>
              </div>
            </div>
          ) : loading ? (
            // 로딩 중
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 mx-auto animate-bounce">
                  <Image src="/logo-final.png" alt="지원함" width={96} height={96} className="w-full h-full object-contain" />
                </div>
                <p className="text-lg font-medium text-gray-700">{loadingMessage}</p>
              </div>
            </div>
          ) : error ? (
            // 에러
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <div className="text-6xl">😢</div>
                <h1 className="text-2xl font-bold text-gray-900">앗!</h1>
                <p className="text-gray-600">{error}</p>
                <Button onClick={() => fetchJobs()}>다시 시도</Button>
              </div>
            </div>
          ) : jobs.length === 0 ? (
            // 공고 없음
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-4 max-w-md">
                <div className="text-6xl">📭</div>
                <h1 className="text-2xl font-bold text-gray-900">공고가 없습니다</h1>
                <p className="text-gray-600">
                  크롤러를 실행하여 공고 데이터를 수집해주세요.
                </p>
                <Button onClick={() => fetchJobs()}>새로고침</Button>
              </div>
            </div>
          ) : currentIndex >= jobs.length ? (
            // 모든 공고 확인 완료
            <div className="w-full h-full flex items-center justify-center">
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
          ) : (
            // 3D 캐러셀 표시
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

      {/* 필터 모달 */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        options={filterOptions}
        onSave={async (newFilters) => {
          if (!user) return

          // DB에 필터 저장 완료를 기다림
          const { error } = await supabase.from('user_preferences').upsert(
            {
              user_id: user.id,
              preferred_job_types: newFilters.preferred_job_types,
              preferred_locations: newFilters.preferred_locations,
              career_level: newFilters.career_level,
              work_style: newFilters.work_style,
              preferred_company_types: newFilters.preferred_company_types,
            },
            { onConflict: 'user_id' }
          )

          if (error) {
            console.error('Failed to save filters:', error)
            alert('필터 저장에 실패했습니다.')
            return
          }

          // 로컬 상태 업데이트 먼저
          setFilters(newFilters)

          // 필터 변경 시 공고 새로 불러오기 (상태 업데이트 후 약간의 지연)
          offsetRef.current = 0
          setAppliedJobs([])

          // 상태 업데이트가 완료되도록 다음 틱에서 실행
          setTimeout(() => {
            fetchJobs()
          }, 0)
        }}
      />
    </div>
  )
}
