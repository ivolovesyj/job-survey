import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ============================================
// Jaro-Winkler 유사도 계산 (비용 없는 유사도 매칭)
// ============================================

function jaroWinklerDistance(s1: string, s2: string): number {
  const len1 = s1.length
  const len2 = s2.length

  if (len1 === 0 && len2 === 0) return 1.0
  if (len1 === 0 || len2 === 0) return 0.0

  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1
  const s1Matches = new Array(len1).fill(false)
  const s2Matches = new Array(len2).fill(false)

  let matches = 0
  let transpositions = 0

  // 매칭 찾기
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow)
    const end = Math.min(i + matchWindow + 1, len2)

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0.0

  // 전치(transposition) 계산
  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  // Jaro 유사도
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3

  // 공통 접두사 길이 (최대 4)
  let prefixLength = 0
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (s1[i] === s2[i]) prefixLength++
    else break
  }

  // Jaro-Winkler 유사도 (p=0.1)
  return jaro + prefixLength * 0.1 * (1 - jaro)
}

// ============================================
// 직무 동의어/관련어 매핑 (의미적 연관성 매칭용)
// ============================================

const JOB_TYPE_SYNONYMS: Record<string, string[]> = {
  // 개발 분야
  '프론트엔드': ['웹개발', '웹퍼블리싱', '퍼블리셔', 'UI개발', 'HTML/CSS', 'React', 'Vue', 'Angular', 'JavaScript', 'TypeScript'],
  '백엔드': ['서버개발', 'API개발', '서버사이드', 'Node.js', 'Spring', 'Django', 'Java', 'Python', 'Go'],
  '풀스택': ['프론트엔드', '백엔드', '웹개발', '서버개발', 'Full-Stack'],
  '웹개발': ['프론트엔드', '백엔드', '풀스택', '웹퍼블리싱'],
  '서버개발': ['백엔드', 'API개발', '서버사이드', '인프라'],
  '모바일': ['iOS', 'Android', '앱개발', '모바일앱', 'React Native', 'Flutter', 'Swift', 'Kotlin'],
  'iOS': ['모바일', '앱개발', 'Swift', 'Objective-C'],
  'Android': ['모바일', '앱개발', 'Kotlin', 'Java'],
  'AI/ML': ['머신러닝', '딥러닝', '인공지능', 'AI', 'ML', '데이터사이언스', 'NLP', 'CV'],
  '머신러닝': ['AI/ML', '딥러닝', '인공지능', 'AI', 'ML', '데이터사이언스'],
  '데이터': ['데이터분석', '데이터엔지니어', 'BI', 'SQL', '빅데이터', '데이터사이언스', 'ETL'],
  '데이터분석': ['데이터', 'BI', 'SQL', '빅데이터', '데이터사이언티스트'],
  'DevOps': ['인프라', 'SRE', '클라우드', 'AWS', 'GCP', 'Azure', '시스템엔지니어', 'CI/CD', 'Kubernetes'],
  '클라우드': ['DevOps', 'AWS', 'GCP', 'Azure', '인프라'],
  '보안': ['정보보안', '보안엔지니어', '시큐리티', 'Security', '보안개발'],
  'QA': ['테스트', '품질관리', 'QA엔지니어', '자동화테스트', 'SDET'],
  '게임': ['게임개발', '게임프로그래머', 'Unity', 'Unreal', '게임클라이언트', '게임서버'],
  '임베디드': ['펌웨어', '하드웨어', 'IoT', '시스템프로그래밍', 'C/C++'],
  // 비개발 분야
  '디자인': ['UI/UX', 'UIUX', 'UX디자인', 'UI디자인', '프로덕트디자인', '그래픽디자인', '시각디자인'],
  'UI/UX': ['디자인', 'UX디자인', 'UI디자인', '프로덕트디자인', '서비스디자인'],
  '기획': ['PM', 'PO', '프로덕트매니저', '서비스기획', '전략기획', '프로젝트매니저'],
  'PM': ['기획', 'PO', '프로덕트매니저', '프로젝트매니저'],
  'PO': ['기획', 'PM', '프로덕트오너', '프로덕트매니저'],
  '마케팅': ['퍼포먼스마케팅', '콘텐츠마케팅', '그로스', '브랜드마케팅', 'SNS마케팅', '디지털마케팅'],
  '영업': ['세일즈', 'Sales', 'BD', '사업개발', '비즈니스개발'],
  'HR': ['인사', '채용', '인사담당', 'HRBP', '조직문화'],
  '재무': ['회계', '경리', 'Finance', 'CFO', '재무회계'],
}

/**
 * 사용자 선호 직무와 공고 직무 간의 의미적 연관성 확인
 * @returns 매칭 점수 (0: 불일치, 1: 동의어 매칭, 2: 역방향 매칭)
 */
function checkSemanticMatch(userPref: string, jobTypes: string[]): number {
  const prefLower = userPref.toLowerCase()
  const synonyms = JOB_TYPE_SYNONYMS[userPref] || []
  const synonymsLower = synonyms.map(s => s.toLowerCase())

  for (const jobType of jobTypes) {
    const jobTypeLower = jobType.toLowerCase()

    // 1. 정방향 동의어 매칭: 사용자 선택의 동의어가 공고에 있는지
    if (synonymsLower.some(syn =>
      jobTypeLower.includes(syn) || syn.includes(jobTypeLower)
    )) {
      return 1
    }

    // 2. 역방향 매칭: 공고 타입의 동의어에 사용자 선택이 있는지
    for (const [key, values] of Object.entries(JOB_TYPE_SYNONYMS)) {
      const keyLower = key.toLowerCase()
      const valuesLower = values.map(v => v.toLowerCase())

      if ((jobTypeLower.includes(keyLower) || keyLower.includes(jobTypeLower)) &&
        valuesLower.some(v => prefLower.includes(v) || v.includes(prefLower))) {
        return 2
      }
    }
  }

  return 0
}

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

  // 1. 직무 매칭 (preferred_job_types) - 필수 필터
  // 다층 매칭: depth_twos (우선) > jobText (보조) > depth_ones (참고)
  if (prefs.preferred_job_types?.length) {
    const jobDepthTwos = job.depth_twos || []
    const jobDepthOnes = job.depth_ones || []
    let jobMatched = false
    let bestMatchScore = 0
    let bestMatchName = ''
    let matchType = ''

    for (const prefType of prefs.preferred_job_types) {
      const prefLower = prefType.toLowerCase()

      // 1단계: depth_twos에서 정확 매칭 (최우선 - 15점)
      const exactMatchInDepthTwos = jobDepthTwos.some(t => {
        const jobTypeLower = t.toLowerCase()
        return jobTypeLower === prefLower ||
          jobTypeLower.includes(prefLower) ||
          prefLower.includes(jobTypeLower)
      })

      if (exactMatchInDepthTwos) {
        score += 15
        reasons.push(`✓ ${prefType}`)
        jobMatched = true
        break
      }

      // 2단계: jobText에서 매칭 (의미적 연관성 - 10점)
      if (jobText.includes(prefLower)) {
        score += 10
        reasons.push(`✓ ${prefType} (본문)`)
        jobMatched = true
        break
      }

      // 2.5단계: 동의어/관련어 매칭 (의미적 연관성 - 8점)
      const semanticMatchScore = checkSemanticMatch(prefType, jobDepthTwos)
      if (semanticMatchScore > 0) {
        score += 8
        reasons.push(`✓ ${prefType} (연관)`)
        jobMatched = true
        break
      }

      // 3단계: depth_twos에서 Jaro-Winkler 유사도 매칭 (임계값 0.85 - 12점)
      for (const jobDepthTwo of jobDepthTwos) {
        const similarity = jaroWinklerDistance(prefLower, jobDepthTwo.toLowerCase())
        if (similarity >= 0.85 && similarity > bestMatchScore) {
          bestMatchScore = similarity
          bestMatchName = prefType
          matchType = 'similarity'
        }
      }

      // 4단계: depth_ones에서 매칭 (대분류 일치 - 약한 신호, 5점)
      // 예: 사용자가 "프론트엔드" 선택, 공고에 "개발" 대분류만 있는 경우
      const matchInDepthOnes = jobDepthOnes.some(d => {
        const dLower = d.toLowerCase()
        // "개발" 대분류 안에 프론트엔드가 속하는지 의미적 연관성 체크
        return prefLower.includes(dLower) || dLower.includes(prefLower)
      })

      if (!jobMatched && matchInDepthOnes && bestMatchScore < 0.85) {
        bestMatchScore = 0.7 // 임계값보다 낮지만 참고용
        bestMatchName = prefType
        matchType = 'depth_one'
      }
    }

    // 유사도 매칭 성공
    if (!jobMatched && bestMatchScore >= 0.85) {
      score += 12
      reasons.push(`✓ ${bestMatchName} (유사)`)
      jobMatched = true
    }

    // 약한 매칭 (대분류만 일치)
    if (!jobMatched && matchType === 'depth_one') {
      score += 5
      reasons.push(`✓ ${bestMatchName} (관련)`)
      jobMatched = true
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

    // 5. 활성 공고 가져오기 (충분히 많이 가져와서 필터링)
    // TODO: 추후 DB 쿼리 최적화 (직무/지역 필터 추가)
    const fetchLimit = Math.max(5000, (offset + limit) * 10)

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
