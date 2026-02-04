import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ============================================
// 점수 계산 로직 (사용자 선호도 기반)
// ============================================

interface UserPreferences {
  preferred_job_types?: string[]
  preferred_locations?: string[]
  career_level?: string
  preferred_company_sizes?: string[]
  preferred_industries?: string[]
  min_salary?: number
  work_style?: string[]  // 고용형태 필터: 정규직, 계약직, 인턴 등
}

interface KeywordWeight {
  keyword: string
  weight: number
}

interface CompanyPref {
  company_name: string
  preference_score: number
}

interface JobRow {
  id: string
  source: string
  company: string
  company_image: string | null
  title: string
  regions: string[] | null
  location: string | null
  career_min: number | null
  career_max: number | null
  employee_types: string[] | null
  deadline_type: string | null
  end_date: string | null
  depth_ones: string[] | null
  depth_twos: string[] | null
  keywords: string[] | null
  views: number | null
  detail: Record<string, string> | null
  original_created_at: string | null
  last_modified_at: string | null
  crawled_at: string
  is_active: boolean
}

function scoreJob(
  job: JobRow,
  prefs: UserPreferences | null,
  keywordWeights: KeywordWeight[],
  companyPrefs: CompanyPref[]
): { score: number; reasons: string[]; warnings: string[]; matchesFilter: boolean } {
  let score = 50
  const reasons: string[] = []
  const warnings: string[] = []
  let matchesFilter = true

  const jobText = `${job.company} ${job.title} ${job.depth_ones?.join(' ') || ''} ${job.depth_twos?.join(' ') || ''} ${job.keywords?.join(' ') || ''} ${job.detail?.raw_content || ''} ${job.detail?.main_tasks || ''} ${job.detail?.requirements || ''}`.toLowerCase()

  if (!prefs) {
    return { score: 50, reasons: ['기본 추천'], warnings: [], matchesFilter: true }
  }

  // 1. 직무 매칭 (preferred_job_types vs depth_ones/depth_twos) - 필수 필터
  if (prefs.preferred_job_types?.length) {
    const jobTypes = [...(job.depth_ones || []), ...(job.depth_twos || [])]
    let jobMatched = false

    for (const prefType of prefs.preferred_job_types) {
      const prefLower = prefType.toLowerCase()

      // 더 유연한 매칭: 정확한 매칭 또는 부분 매칭
      const matches = jobTypes.some(t => {
        const jobTypeLower = t.toLowerCase()
        // 1) 정확히 일치
        if (jobTypeLower === prefLower) return true
        // 2) 선호 직무가 공고 직무에 포함됨
        if (jobTypeLower.includes(prefLower)) return true
        // 3) 공고 직무가 선호 직무에 포함됨
        if (prefLower.includes(jobTypeLower)) return true
        return false
      }) || jobText.includes(prefLower)

      if (matches) {
        score += 15
        reasons.push(`✓ ${prefType}`)
        jobMatched = true
        break
      }
    }

    // 직무가 하나도 매칭되지 않으면 필터 불통과
    if (!jobMatched) {
      matchesFilter = false
      score = 0
      warnings.push('⚠️ 선호 직무 불일치')
    }
  }

  // 2. 지역 매칭
  if (prefs.preferred_locations?.length && job.location) {
    const locationMatch = prefs.preferred_locations.some(loc =>
      job.location!.includes(loc) || loc.includes(job.location!)
    )
    if (locationMatch) {
      score += 10
      reasons.push('✓ 선호 지역')
    } else {
      score -= 30
      warnings.push(`⚠️ ${job.location} (선호 지역 아님)`)
    }
  }

  // 3. 경력 매칭
  if (prefs.career_level) {
    const isNewbie = prefs.career_level === '신입' || prefs.career_level === '경력무관'
    if (isNewbie) {
      if (job.career_min === 0 || job.career_min === null) {
        score += 5
        reasons.push('✓ 신입 가능')
      } else if (job.career_min && job.career_min >= 3) {
        score -= 20
        warnings.push(`⚠️ 경력 ${job.career_min}년 이상`)
      }
    }
  }

  // 3.5 고용형태 매칭
  if (prefs.work_style?.length && job.employee_types?.length) {
    const match = prefs.work_style.some(ws => job.employee_types!.includes(ws))
    if (match) {
      score += 5
      reasons.push('✓ 희망 고용형태')
    }
  }

  // 4. 학습된 키워드 가중치
  for (const kw of keywordWeights) {
    if (jobText.includes(kw.keyword.toLowerCase())) {
      const impact = Math.max(-5, Math.min(5, kw.weight))
      score += impact
      if (Math.abs(kw.weight) >= 3) {
        if (kw.weight > 0) reasons.push(`📈 "${kw.keyword}"`)
        else warnings.push(`📉 "${kw.keyword}"`)
      }
    }
  }

  // 5. 학습된 회사 선호도
  const companyPref = companyPrefs.find(c =>
    job.company.includes(c.company_name) || c.company_name.includes(job.company)
  )
  if (companyPref && Math.abs(companyPref.preference_score) >= 2) {
    const impact = Math.max(-10, Math.min(10, companyPref.preference_score))
    score += impact
    if (companyPref.preference_score >= 2) reasons.push('🏢 선호 기업')
    else if (companyPref.preference_score <= -2) warnings.push('🏢 비선호 기업')
  }

  // 6. 최신 공고 부스트
  if (job.crawled_at) {
    const hoursSince = (Date.now() - new Date(job.crawled_at).getTime()) / (1000 * 60 * 60)
    if (hoursSince <= 24) {
      score += 5
      reasons.push('🆕 신규')
    } else if (hoursSince <= 72) {
      score += 3
    }
  }

  score = Math.max(0, Math.min(100, score))
  return { score, reasons, warnings, matchesFilter }
}

// ============================================
// API Handler
// ============================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 인증 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // 토큰이 없으면 비로그인 사용자: 기본 공고 제공
    if (!token) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_active', true)
        .order('crawled_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (jobsError) {
        console.error('Jobs query error:', jobsError)
        return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
      }

      if (!jobs || jobs.length === 0) {
        return NextResponse.json({
          jobs: [],
          total: 0,
          limit,
          offset,
          message: 'No jobs available. Please run the crawler first.',
        })
      }

      // 비로그인 사용자: 최신순 공고, 기본 점수 50점
      const now = Date.now()
      const basicJobs = jobs.map((job: JobRow) => {
        const isNew = (now - new Date(job.crawled_at).getTime()) < 24 * 60 * 60 * 1000

        return {
          id: job.id,
          company: job.company,
          company_image: job.company_image,
          title: job.title,
          location: job.location || '위치 미정',
          score: 50,
          reason: isNew ? '🆕 신규 공고' : '최신 공고',
          reasons: isNew ? ['🆕 신규'] : ['최신 공고'],
          warnings: [],
          link: `https://zighang.com/recruitment/${job.id}`,
          source: job.source,
          crawledAt: job.crawled_at,
          detail: job.detail,
          depth_ones: job.depth_ones,
          depth_twos: job.depth_twos,
          keywords: job.keywords,
          career_min: job.career_min,
          career_max: job.career_max,
          employee_types: job.employee_types,
          deadline_type: job.deadline_type,
          end_date: job.end_date,
          is_new: isNew,
        }
      })

      return NextResponse.json({
        jobs: basicJobs,
        total: basicJobs.length,
        limit,
        offset,
        hasMore: jobs.length === limit, // 정확한 hasMore는 알 수 없지만 추정
      })
    }

    // === 로그인 사용자: 맞춤형 추천 ===

    // 토큰을 포함한 supabase 클라이언트 생성 (RLS 통과용)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
    })

    // 토큰으로 직접 유저 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (!user || userError) {
      console.log('[Jobs API] Auth failed:', userError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 병렬로 데이터 가져오기
    const [prefsResult, keywordsResult, companiesResult, seenResult] = await Promise.all([
      // 1. 사용자 선호도
      supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single(),
      // 2. 학습된 키워드 가중치
      supabase
        .from('keyword_weights')
        .select('keyword, weight')
        .eq('user_id', user.id)
        .order('weight', { ascending: false })
        .limit(100),
      // 3. 학습된 회사 선호도
      supabase
        .from('company_preference')
        .select('company_name, preference_score')
        .eq('user_id', user.id),
      // 4. 이미 본 공고 ID
      supabase
        .from('user_job_actions')
        .select('job_id')
        .eq('user_id', user.id),
    ])

    const preferences: UserPreferences | null = prefsResult.data
    const keywordWeights: KeywordWeight[] = keywordsResult.data || []
    const companyPrefs: CompanyPref[] = companiesResult.data || []
    const seenJobIds = new Set(seenResult.data?.map(a => a.job_id) || [])

    // 5. 활성 공고 가져오기 (넉넉하게)
    const fetchLimit = (offset + limit) * 3 + 200
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('is_active', true)
      .order('crawled_at', { ascending: false })
      .limit(fetchLimit)

    if (jobsError) {
      console.error('Jobs query error:', jobsError)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({
        jobs: [],
        total: 0,
        limit,
        offset,
        message: 'No jobs available. Please run the crawler first.',
      })
    }

    // 6. 이미 본 공고 제외 + 점수 계산 + 필터링 + 정렬
    const now = Date.now()
    const scoredJobs = jobs
      .filter((job: JobRow) => !seenJobIds.has(job.id))
      .map((job: JobRow) => {
        const { score, reasons, warnings, matchesFilter } = scoreJob(job, preferences, keywordWeights, companyPrefs)
        const isNew = (now - new Date(job.crawled_at).getTime()) < 24 * 60 * 60 * 1000

        return {
          id: job.id,
          company: job.company,
          company_image: job.company_image,
          title: job.title,
          location: job.location || '위치 미정',
          score,
          reason: reasons[0] || '추천 공고',
          reasons,
          warnings,
          link: `https://zighang.com/recruitment/${job.id}`,
          source: job.source,
          crawledAt: job.crawled_at,
          detail: job.detail,
          depth_ones: job.depth_ones,
          depth_twos: job.depth_twos,
          keywords: job.keywords,
          career_min: job.career_min,
          career_max: job.career_max,
          employee_types: job.employee_types,
          deadline_type: job.deadline_type,
          end_date: job.end_date,
          is_new: isNew,
          matchesFilter,
        }
      })
      .filter(j => j.matchesFilter) // 필터 통과한 공고만
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return new Date(b.crawledAt).getTime() - new Date(a.crawledAt).getTime()
      })

    // 7. 40점 이상 필터 + 페이지네이션
    const passedJobs = scoredJobs.filter(j => j.score >= 40)
    const paginatedJobs = passedJobs.slice(offset, offset + limit)

    return NextResponse.json({
      jobs: paginatedJobs,
      total: passedJobs.length,
      limit,
      offset,
      hasMore: offset + limit < passedJobs.length,
    })

  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
