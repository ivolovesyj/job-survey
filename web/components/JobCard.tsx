'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, ExternalLink, X, Briefcase, Clock, Check, Calendar, Building2 } from 'lucide-react'
import { Job } from '@/types/job'
import { useState } from 'react'

interface JobCardProps {
  job: Job
  onPass?: () => void
  onHold?: () => void
  onApply?: () => void
  disabled?: boolean
  style?: React.CSSProperties
}

function formatCareer(job: Job): string {
  if (job.career_min === 0 && (job.career_max === null || job.career_max === undefined)) return '신입/경력무관'
  if (job.career_min === 0 && job.career_max) return `신입~${job.career_max}년`
  if (job.career_min && job.career_max) return `${job.career_min}~${job.career_max}년`
  if (job.career_min) return `${job.career_min}년 이상`
  return job.info || '신입'
}

function formatDeadline(job: Job): string | null {
  if (job.end_date) {
    const d = new Date(job.end_date)
    return `~${d.getMonth() + 1}/${d.getDate()}`
  }
  if (job.deadline_type === '상시채용') return '상시'
  if (job.deadline_type === '채용시마감') return '채용시마감'
  return null
}

// 연속 줄바꿈을 하나로 압축
function compactText(text: string): string {
  return text
    .trim()
    .replace(/\n{3,}/g, '\n\n')  // 3개 이상 줄바꿈 -> 2개로
    .replace(/\n{2}/g, '\n')      // 2개 줄바꿈 -> 1개로
}

export function JobCard({ job, onPass, onHold, onApply, disabled, style }: JobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [clickedBtn, setClickedBtn] = useState<'pass' | 'hold' | 'apply' | null>(null)
  const matchPercent = job.score
  const deadline = formatDeadline(job)

  const handleButtonClick = (action: 'pass' | 'hold' | 'apply', callback?: () => void) => {
    setClickedBtn(action)
    // 애니메이션 후 콜백 실행
    setTimeout(() => {
      callback?.()
      setClickedBtn(null)
    }, 300)
  }

  // 직군 태그: depth_twos 우선, 없으면 depth_ones
  const tags = (job.depth_twos?.length ? job.depth_twos : job.depth_ones) || []

  return (
    <Card
      className="w-full max-w-lg hover:shadow-xl transition-all duration-200 flex flex-col select-none border border-gray-200 bg-white"
      style={style}
    >
      <div className="flex-1">
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2">
            {matchPercent > 50 ? (
              <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-sm font-semibold">적합도 {matchPercent}%</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-sm font-medium">적합도 분석중</span>
              </div>
            )}
            {deadline && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 text-xs rounded-full border border-gray-200">
                <Calendar className="w-3 h-3" />
                {deadline}
              </span>
            )}
            {job.company_type && job.company_type !== '기타' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-200">
                <Building2 className="w-3 h-3" />
                {job.company_type}
              </span>
            )}
          </div>
        </div>

        <CardContent className="space-y-3 pt-3 px-4 pb-4">
          {/* 회사명 + 이미지 */}
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              {job.company_image && (
                <img
                  src={job.company_image}
                  alt={job.company}
                  className="w-9 h-9 rounded-lg object-contain bg-gray-50 border border-gray-100"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <h2 className="text-xl font-bold text-gray-900 leading-tight">{job.company}</h2>
            </div>
            <h3 className="text-base text-gray-700 leading-snug">{job.title}</h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500 font-medium">위치</div>
                <div className="text-sm text-gray-900">{job.location || '미정'}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500 font-medium">경력</div>
                <div className="text-sm text-gray-900">{formatCareer(job)}</div>
              </div>
            </div>
          </div>

          {/* 모든 태그 한 줄로 통합 */}
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200">
                {tag.replace(/_/g, ' ')}
              </span>
            ))}
            {job.employee_types?.slice(0, 1).map((type, i) => (
              <span key={`et-${i}`} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-200">
                {type}
              </span>
            ))}
            {job.reasons?.filter(r => {
              // '신규' 제외
              if (r.includes('신규')) return false
              // '희망 고용형태' 제외 (파란색 고용형태 태그와 중복)
              if (r === '희망 고용형태') return false
              // 직무 태그와 중복되는 reasons 제외 (보라색 직무 태그와 중복)
              const cleanReason = r.replace(/\s*\(본문\)|\(연관\)|\(유사\)|\(관련\)/g, '').trim()
              if (tags.some(tag => tag.replace(/_/g, ' ') === cleanReason)) return false
              return true
            }).slice(0, 2).map((reason, i) => (
              <span key={`r-${i}`} className="text-xs px-2 py-0.5 bg-gray-50 text-gray-600 rounded-md border border-gray-200">
                {reason.replace(/_/g, ' ')}
              </span>
            ))}
            {job.is_new && (
              <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-md border border-green-200">
                🆕 신규
              </span>
            )}
          </div>

          {/* 공고보기 버튼 */}
          <div className="pt-2">
            <a
              href={job.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              공고보기
            </a>
          </div>

          {isExpanded && (
            <div className="pt-3 border-t border-gray-100 space-y-2.5 animate-in fade-in slide-in-from-top-2 max-h-[40vh] overflow-y-auto">
              {job.detail?.intro && (
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">📋 회사 소개</div>
                  <p className="text-sm text-gray-700 leading-snug whitespace-pre-wrap">{compactText(job.detail.intro)}</p>
                </div>
              )}

              {job.detail?.main_tasks && (
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">💼 주요 업무</div>
                  <p className="text-sm text-gray-700 leading-snug whitespace-pre-wrap">{compactText(job.detail.main_tasks)}</p>
                </div>
              )}

              {job.detail?.requirements && (
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">✅ 자격 요건</div>
                  <p className="text-sm text-gray-700 leading-snug whitespace-pre-wrap">{compactText(job.detail.requirements)}</p>
                </div>
              )}

              {job.detail?.preferred_points && (
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">⭐ 우대 사항</div>
                  <p className="text-sm text-gray-700 leading-snug whitespace-pre-wrap">{compactText(job.detail.preferred_points)}</p>
                </div>
              )}

              {job.detail?.benefits && (
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">🎁 복지 혜택</div>
                  <p className="text-sm text-gray-700 leading-snug whitespace-pre-wrap">{compactText(job.detail.benefits)}</p>
                </div>
              )}

              {job.detail?.work_conditions && (
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">🏢 근무 조건</div>
                  <p className="text-sm text-gray-700 leading-snug whitespace-pre-wrap">{compactText(job.detail.work_conditions)}</p>
                </div>
              )}

              {/* 파싱된 필드가 모두 비어있지만 raw_content가 있으면 전체 표시 */}
              {job.detail?.raw_content && !job.detail?.intro && !job.detail?.main_tasks && !job.detail?.requirements && (
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">📄 상세 정보</div>
                  <p className="text-sm text-gray-700 leading-snug whitespace-pre-wrap">{compactText(job.detail.raw_content)}</p>
                </div>
              )}

              {job.warnings && job.warnings.length > 0 && (
                <div>
                  <div className="text-sm font-bold text-gray-900 mb-1">⚠️ 주의사항</div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.warnings.map((warning, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 bg-red-50 text-red-700 rounded-md border border-red-200">
                        {warning}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">{job.source}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-200 bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-sm hover:shadow-md"
            >
              {isExpanded ? (
                <>
                  <span>접기</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </>
              ) : (
                <>
                  <span>더보기</span>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </CardContent>
      </div>

      <CardContent className="pt-0 pb-4 px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className={`flex-1 h-11 border-red-200 hover:border-red-300 hover:bg-red-50 transition-all font-medium ${clickedBtn === 'pass' ? 'animate-pulse bg-red-100 border-red-400 scale-95' : ''
              }`}
            onClick={(e) => {
              e.stopPropagation()
              handleButtonClick('pass', onPass)
            }}
            disabled={disabled || clickedBtn !== null}
          >
            <X className={`h-4 w-4 mr-1.5 text-red-600 ${clickedBtn === 'pass' ? 'animate-bounce' : ''}`} />
            <span className="text-sm text-red-700">{clickedBtn === 'pass' ? '처리중...' : '지원 안 함'}</span>
          </Button>
          <Button
            variant="outline"
            className={`flex-1 h-11 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all font-medium ${clickedBtn === 'hold' ? 'animate-pulse bg-yellow-100 border-yellow-400 scale-95' : ''
              }`}
            onClick={(e) => {
              e.stopPropagation()
              handleButtonClick('hold', onHold)
            }}
            disabled={disabled || clickedBtn !== null}
          >
            <Clock className={`h-4 w-4 mr-1.5 text-gray-600 ${clickedBtn === 'hold' ? 'animate-bounce' : ''}`} />
            <span className="text-sm text-gray-700">{clickedBtn === 'hold' ? '처리중...' : '보류'}</span>
          </Button>
          <Button
            className={`flex-1 h-11 bg-blue-600 hover:bg-blue-700 transition-all font-medium ${clickedBtn === 'apply' ? 'animate-pulse bg-green-500 scale-95' : ''
              }`}
            onClick={(e) => {
              e.stopPropagation()
              handleButtonClick('apply', onApply)
            }}
            disabled={disabled || clickedBtn !== null}
          >
            <Check className={`h-4 w-4 mr-1.5 ${clickedBtn === 'apply' ? 'animate-bounce' : ''}`} />
            <span className="text-sm">{clickedBtn === 'apply' ? '처리중...' : '지원 예정'}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
