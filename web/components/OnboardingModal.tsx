'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { X, ChevronRight, ChevronLeft, Check, ChevronDown } from 'lucide-react'

interface OnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

const CAREER_OPTIONS = [
  { value: '신입', label: '신입 (0년)' },
  { value: '1-3', label: '1~3년' },
  { value: '3-5', label: '3~5년' },
  { value: '5-10', label: '5~10년' },
  { value: '10+', label: '10년 이상' },
  { value: '경력무관', label: '경력무관' },
]

// 대분류 > 소분류 직무 데이터 (직행 기준)
const JOB_CATEGORIES: Record<string, string[]> = {
  'IT·개발': [
    '전체', '서버·백엔드', '프론트엔드', '웹풀스택', '안드로이드', 'iOS', '크로스플랫폼',
    'DBA', 'DevOps·SRE', '시스템·네트워크', '정보보호·보안', '임베디드소프트웨어',
    'QA·테스트', '개발PM', '웹퍼블리싱', 'VR·AR·3D', '블록체인'
  ],
  'AI·데이터': [
    '전체', '데이터분석가', '데이터사이언티스트', '데이터엔지니어', '머신러닝엔지니어',
    '생성형AI', 'AI서비스기획', 'AI리서치', 'NLP', 'LLM', 'MLOps'
  ],
  '게임': [
    '전체', '게임기획·PM', '게임운영', '게임QA', '게임개발·클라이언트', '게임개발·서버',
    '테크니컬아티스트', '게임아트', '게임3D모델링', '게임애니메이션'
  ],
  '디자인': [
    '전체', '웹디자인', 'UIUX·프로덕트', '그래픽·시각', '일러스트레이터', '브랜딩·BI·BX',
    '공간·실내·VMD', '산업·제품', '영상·모션', '3D·VFX', '출판·편집'
  ],
  '기획·전략': [
    '전체', 'PM·PO', '서비스·상품기획', '사업·전략기획', '컨설팅', '사업개발·분석',
    '프로젝트매니저', '운영관리·OM', '경영지원'
  ],
  '마케팅·광고': [
    '전체', '마케팅기획·전략', '퍼포먼스마케팅', '콘텐츠마케팅', 'SNS마케팅',
    '브랜드마케팅', 'CRM마케팅', '글로벌마케팅', '광고기획·AE', '홍보·PR'
  ],
  '상품기획·MD': [
    '전체', '상품기획', '온라인MD', '식품MD', '패션MD', '뷰티MD', '영업MD', '리테일MD'
  ],
  '영업': [
    '전체', 'B2C영업', 'B2B영업', '일반영업', '영업관리·지원', '기술·IT영업',
    '금융·보험영업', '해외영업', '제약·의료영업'
  ],
  '무역·물류': [
    '전체', '해외·상사영업', '수출입관리·사무', '포워딩', '구매·조달', '물류·SCM',
    '자재·재고관리', '유통관리'
  ],
  '법률·법무': [
    '전체', '변호사', '변리사', '법무', '컴플라이언스', '내부감사', 'ESG·윤리', '특허·IP'
  ],
  'HR·총무': [
    '전체', '인사기획', '평가·보상', 'HRD·조직문화', '리크루터·헤드헌터', '노무관리', '총무·비서'
  ],
  '회계·세무·재무': [
    '전체', '재무', '회계', '세무', 'IR·공시', '경리·회계보조'
  ],
  '증권·운용': [
    '전체', '운용·트레이딩', '리스크·준법·심사', 'VC·PE', '증권IB', 'PB·WM', '금융상품개발·영업'
  ],
  '은행·카드·보험': [
    '전체', '은행', '카드사', '캐피탈', '보험설계', '언더라이팅·심사', '보험상품개발'
  ],
  '엔지니어링·R&D': [
    '전체', '반도체·디스플레이', '전기·전자·제어', '기계', '기계설계·CAD', '자동차',
    '화학', '바이오·제약', '에너지', '환경'
  ],
  '건설·건축': [
    '전체', '건축설계·시공', '토목·측량·조경·환경', '기계·전기·소방·설비',
    '설계·감리·시공·공무', '안전·품질·재료'
  ],
  '의료·보건': [
    '전체', '의사', '약사·약무보조', '간호사', '간호조무사', '물리치료·작업치료',
    '영양사·임상영양사', '병원행정·접수·수납'
  ],
  '교육': [
    '전체', '유치원·보육교사', '대학교수·강사', '입시학원강사', '국어·외국어강사',
    '학원상담·운영', '교재개발·교수설계'
  ],
  '미디어·엔터': [
    '전체', 'PD·감독', '콘텐츠기획·에디터', '방송작가', '영상편집', 'CG·모션그래픽',
    '기자·리포터', '크리에이터·인플루언서', '통·번역', '웹툰·웹소설'
  ],
  '고객상담·TM': [
    '전체', '인바운드', '아웃바운드', 'CS', 'CX매니저'
  ],
  '서비스': [
    '전체', '설치·수리기사', '호텔서비스', '관광서비스', '항공서비스', '매장관리',
    '안내·리셉션', '헤어디자이너', '메이크업·네일'
  ],
  '식음료': [
    '전체', '식품가공·개발', '주방조리', '제과·제빵', '음료·주류', '매장운영', '서비스·홀스태프'
  ],
}

const locationOptions = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '세종', '강원', '충청', '전라', '경상', '제주', '원격근무']
const employeeTypeOptions = ['정규직', '계약직', '인턴', '프리랜서']

// localStorage 키
const ONBOARDING_STATE_KEY = 'onboarding_state'

interface OnboardingState {
  step: number
  selectedJobs: string[]
  selectedCareers: string[]
  selectedLocations: string[]
  selectedEmployeeTypes: string[]
  selectedCategory: string | null
}

function loadOnboardingState(): OnboardingState | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem(ONBOARDING_STATE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function saveOnboardingState(state: OnboardingState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

function clearOnboardingState() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(ONBOARDING_STATE_KEY)
  } catch {
    // ignore
  }
}

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { user } = useAuth()

  // 초기값을 localStorage에서 불러오기
  const savedState = loadOnboardingState()

  const [step, setStep] = useState(savedState?.step || 1)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(savedState?.selectedCategory || null)
  const [selectedJobs, setSelectedJobs] = useState<string[]>(savedState?.selectedJobs || [])
  const [selectedCareers, setSelectedCareers] = useState<string[]>(savedState?.selectedCareers || ['경력무관'])
  const [selectedLocations, setSelectedLocations] = useState<string[]>(savedState?.selectedLocations || [])
  const [selectedEmployeeTypes, setSelectedEmployeeTypes] = useState<string[]>(savedState?.selectedEmployeeTypes || [])
  const [saving, setSaving] = useState(false)

  // 상태 변경시 localStorage에 저장
  const updateState = () => {
    saveOnboardingState({
      step,
      selectedJobs,
      selectedCareers,
      selectedLocations,
      selectedEmployeeTypes,
      selectedCategory,
    })
  }

  // 상태 변경 감지
  useState(() => {
    updateState()
  })

  const toggle = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item])
  }

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category)
  }

  const handleJobSelect = (category: string, job: string) => {
    const fullJob = job === '전체' ? `${category} 전체` : `${category}/${job}`
    toggle(selectedJobs, setSelectedJobs, fullJob)
  }

  const isJobSelected = (category: string, job: string) => {
    const fullJob = job === '전체' ? `${category} 전체` : `${category}/${job}`
    return selectedJobs.includes(fullJob)
  }

  const handleSave = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }
    if (selectedJobs.length === 0) {
      alert('직무를 선택해주세요.')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.from('user_preferences').upsert(
        {
          user_id: user.id,
          preferred_job_types: selectedJobs,
          preferred_locations: selectedLocations.length > 0 ? selectedLocations : ['서울'],
          career_level: selectedCareers.join(','),
          work_style: selectedEmployeeTypes.length > 0 ? selectedEmployeeTypes : ['정규직'],
        },
        { onConflict: 'user_id' }
      )

      if (error) {
        console.error('Supabase error:', error)
        alert(`저장 실패: ${error.message}`)
        return
      }

      // 저장 성공시 localStorage 초기화
      clearOnboardingState()
      onComplete()
    } catch (error) {
      console.error('Failed to save preferences:', error)
      alert('저장 실패: 네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      return
    }

    try {
      const { error } = await supabase.from('user_preferences').upsert(
        {
          user_id: user.id,
          preferred_job_types: ['IT·개발 전체'],
          preferred_locations: ['서울'],
          career_level: '경력무관',
          work_style: ['정규직'],
        },
        { onConflict: 'user_id' }
      )

      if (error) {
        console.error('Supabase error:', error)
        return
      }

      clearOnboardingState()
      onComplete()
    } catch (error) {
      console.error('Failed to save default preferences:', error)
    }
  }

  // step 변경시 저장
  const handleStepChange = (newStep: number) => {
    setStep(newStep)
    setTimeout(() => {
      saveOnboardingState({
        step: newStep,
        selectedJobs,
        selectedCareers,
        selectedLocations,
        selectedEmployeeTypes,
        selectedCategory,
      })
    }, 0)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">선호 조건 설정</h2>
              <p className="text-sm text-gray-600 mt-1">
                Step {step}/4 - 더 정확한 공고를 추천해드려요
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step 1: 직무 (계층형) */}
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">관심있는 직무를 선택해주세요</h3>
                <p className="text-sm text-gray-600 mb-4">대분류를 클릭하면 세부 직무를 선택할 수 있어요</p>

                {/* 선택된 직무 태그 */}
                {selectedJobs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
                    {selectedJobs.map(job => (
                      <span
                        key={job}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-full"
                      >
                        {job}
                        <button
                          onClick={() => setSelectedJobs(selectedJobs.filter(j => j !== job))}
                          className="hover:bg-blue-700 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* 대분류 아코디언 */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {Object.keys(JOB_CATEGORIES).map(category => (
                    <div key={category} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleCategorySelect(category)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${
                          selectedCategory === category
                            ? 'bg-gray-100'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-medium text-gray-900">{category}</span>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-500 transition-transform ${
                            selectedCategory === category ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {selectedCategory === category && (
                        <div className="px-4 py-3 bg-gray-50 border-t">
                          <div className="flex flex-wrap gap-2">
                            {JOB_CATEGORIES[category].map(job => (
                              <button
                                key={job}
                                onClick={() => handleJobSelect(category, job)}
                                className={`px-3 py-1.5 text-sm rounded-full border transition ${
                                  isJobSelected(category, job)
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                }`}
                              >
                                {job}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 경력 (다중 선택) */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">경력을 선택해주세요</h3>
                <p className="text-sm text-gray-600 mb-4">여러 개 선택 가능합니다</p>
                <div className="flex flex-wrap gap-2">
                  {CAREER_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => toggle(selectedCareers, setSelectedCareers, option.value)}
                      className={`px-4 py-2 rounded-full border transition ${
                        selectedCareers.includes(option.value)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: 지역 */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">희망 근무 지역을 선택해주세요</h3>
                <p className="text-sm text-gray-600 mb-4">여러 개 선택 가능합니다</p>
                <div className="flex flex-wrap gap-2">
                  {locationOptions.map(loc => (
                    <button
                      key={loc}
                      onClick={() => toggle(selectedLocations, setSelectedLocations, loc)}
                      className={`px-4 py-2 rounded-full border transition ${
                        selectedLocations.includes(loc)
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: 고용형태 */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">희망 고용형태를 선택해주세요</h3>
                <p className="text-sm text-gray-600 mb-4">여러 개 선택 가능합니다</p>
                <div className="flex flex-wrap gap-2">
                  {employeeTypeOptions.map(type => (
                    <button
                      key={type}
                      onClick={() => toggle(selectedEmployeeTypes, setSelectedEmployeeTypes, type)}
                      className={`px-4 py-2 rounded-full border transition ${
                        selectedEmployeeTypes.includes(type)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <div className="flex gap-2">
              {step > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStepChange(step - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  이전
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-gray-500"
              >
                건너뛰기
              </Button>
            </div>

            {step < 4 ? (
              <Button
                onClick={() => handleStepChange(step + 1)}
                disabled={step === 1 && selectedJobs.length === 0}
              >
                다음
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={saving || selectedJobs.length === 0}
              >
                {saving ? '저장 중...' : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    완료
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
