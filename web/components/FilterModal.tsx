'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X as XIcon, Check, Search } from 'lucide-react'

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  filters: UserFilters | null
  options: {
    depth_ones: string[]
    depth_twos_map: Record<string, string[]>
    regions: string[]
    employee_types: string[]
  } | null
  onSave: (filters: UserFilters) => void
}

interface UserFilters {
  preferred_job_types: string[]
  preferred_locations: string[]
  career_level: string
  work_style: string[]
}

type FilterCategory = 'job' | 'career' | 'region' | 'employment'

const CAREER_OPTIONS = [
  { value: '신입', label: '신입' },
  { value: '1-3', label: '1~3년' },
  { value: '3-5', label: '3~5년' },
  { value: '5-10', label: '5~10년' },
  { value: '10+', label: '10년+' },
  { value: '경력무관', label: '경력무관' },
]

export function FilterModal({ isOpen, onClose, filters, options, onSave }: FilterModalProps) {
  // 1단계: 대분류 선택
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('job')

  // 2단계: 직무의 경우 대분류 선택
  const [selectedDepthOne, setSelectedDepthOne] = useState<string | null>(null)

  // 3단계: 최종 선택값
  const [selectedDepthTwos, setSelectedDepthTwos] = useState<string[]>([])
  const [selectedCareers, setSelectedCareers] = useState<string[]>(['경력무관'])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<string[]>([])

  // 검색
  const [searchQuery, setSearchQuery] = useState('')

  // filters 변경 시 로컬 상태 업데이트
  useEffect(() => {
    if (!options || !filters) return

    // 직무
    const displayJobTypes = filters.preferred_job_types?.map(job => job.replace(/_/g, '·')) || []
    const depth2s: string[] = []
    displayJobTypes.forEach(job => {
      if (!options.depth_ones.includes(job)) {
        depth2s.push(job)
      }
    })
    setSelectedDepthTwos(depth2s)

    // 경력
    setSelectedCareers(filters.career_level ? filters.career_level.split(',').filter(Boolean) : ['경력무관'])

    // 지역
    setSelectedRegions(filters.preferred_locations || [])

    // 고용형태
    setSelectedEmploymentTypes(filters.work_style || [])
  }, [filters, options])

  const handleSave = () => {
    const finalJobTypes = selectedDepthTwos.map(job => job.replace(/·/g, '_'))
    const newFilters: UserFilters = {
      preferred_job_types: finalJobTypes,
      preferred_locations: selectedRegions,
      career_level: selectedCareers.join(','),
      work_style: selectedEmploymentTypes,
    }
    onSave(newFilters)
    onClose()
  }

  const handleReset = () => {
    setSelectedDepthTwos([])
    setSelectedCareers(['경력무관'])
    setSelectedRegions([])
    setSelectedEmploymentTypes([])
    setSelectedDepthOne(null)
    setSearchQuery('')
  }

  const toggleDepthTwo = (depthTwo: string) => {
    setSelectedDepthTwos(prev =>
      prev.includes(depthTwo) ? prev.filter(d => d !== depthTwo) : [...prev, depthTwo]
    )
  }

  const toggleCareer = (career: string) => {
    setSelectedCareers(prev =>
      prev.includes(career) ? prev.filter(c => c !== career) : [...prev, career]
    )
  }

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev =>
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    )
  }

  const toggleEmploymentType = (type: string) => {
    setSelectedEmploymentTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  if (!isOpen || !options) return null

  // 선택된 개수 계산
  const getSelectionCount = (category: FilterCategory) => {
    switch (category) {
      case 'job':
        return selectedDepthTwos.length
      case 'career':
        return selectedCareers.length
      case 'region':
        return selectedRegions.length
      case 'employment':
        return selectedEmploymentTypes.length
      default:
        return 0
    }
  }

  // 검색 필터링
  const filteredDepthOnes = options.depth_ones.filter(depthOne =>
    depthOne.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDepthTwos = selectedDepthOne
    ? (options.depth_twos_map[selectedDepthOne] || []).filter(depthTwo =>
        depthTwo.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">필터 선택</h2>
            <button
              onClick={handleReset}
              className="text-[15px] text-gray-500 hover:text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-100 transition"
            >
              초기화
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 3단 레이아웃 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 1단계: 대분류 (왼쪽) */}
          <div className="w-48 border-r bg-gray-50 overflow-y-auto">
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  setSelectedCategory('job')
                  setSelectedDepthOne(null)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg text-[15px] font-medium transition ${
                  selectedCategory === 'job'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>직무</span>
                  {getSelectionCount('job') > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedCategory === 'job'
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {getSelectionCount('job')}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  setSelectedCategory('career')
                  setSelectedDepthOne(null)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg text-[15px] font-medium transition ${
                  selectedCategory === 'career'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>경력</span>
                  {getSelectionCount('career') > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedCategory === 'career'
                          ? 'bg-white/20 text-white'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {getSelectionCount('career')}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  setSelectedCategory('region')
                  setSelectedDepthOne(null)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg text-[15px] font-medium transition ${
                  selectedCategory === 'region'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>지역</span>
                  {getSelectionCount('region') > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedCategory === 'region'
                          ? 'bg-white/20 text-white'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {getSelectionCount('region')}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  setSelectedCategory('employment')
                  setSelectedDepthOne(null)
                }}
                className={`w-full text-left px-4 py-3 rounded-lg text-[15px] font-medium transition ${
                  selectedCategory === 'employment'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>고용형태</span>
                  {getSelectionCount('employment') > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedCategory === 'employment'
                          ? 'bg-white/20 text-white'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {getSelectionCount('employment')}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* 2단계: 중분류 (직무의 경우만 표시) */}
          {selectedCategory === 'job' && (
            <div className="w-56 border-r bg-white overflow-hidden flex flex-col">
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="직무 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-[14px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <div className="text-xs font-semibold text-gray-500 mb-2 px-2">하나를 선택하세요</div>
                <div className="space-y-1">
                  {filteredDepthOnes.map(depthOne => {
                    const depthTwos = options.depth_twos_map[depthOne] || []
                    const selectedCount = depthTwos.filter(dt => selectedDepthTwos.includes(dt)).length

                    return (
                      <button
                        key={depthOne}
                        onClick={() => setSelectedDepthOne(depthOne)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-[15px] transition ${
                          selectedDepthOne === depthOne
                            ? 'bg-purple-50 text-purple-700 font-medium border border-purple-200'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{depthOne}</span>
                          {selectedCount > 0 && (
                            <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                              {selectedCount}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                  {filteredDepthOnes.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-8">
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3단계: 소분류/최종 선택 */}
          <div className="flex-1 bg-white overflow-y-auto">
            <div className="p-6">
              {selectedCategory === 'job' && selectedDepthOne && (
                <div>
                  <div className="text-[15px] font-semibold text-gray-700 mb-3">{selectedDepthOne}</div>
                  <div className="flex flex-wrap gap-2">
                    {filteredDepthTwos.map(depthTwo => (
                      <button
                        key={depthTwo}
                        onClick={() => toggleDepthTwo(depthTwo)}
                        className={`px-4 py-2 rounded-full text-[15px] border transition ${
                          selectedDepthTwos.includes(depthTwo)
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                        }`}
                      >
                        {depthTwo}
                      </button>
                    ))}
                    {filteredDepthTwos.length === 0 && searchQuery && (
                      <div className="w-full text-center text-gray-500 text-sm py-8">
                        검색 결과가 없습니다
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedCategory === 'job' && !selectedDepthOne && (
                <div className="text-center text-gray-500 text-[15px] mt-20">
                  왼쪽에서 직무 카테고리를 선택하세요
                </div>
              )}

              {selectedCategory === 'career' && (
                <div>
                  <div className="text-[15px] font-semibold text-gray-700 mb-3">경력 선택 (여러 개 가능)</div>
                  <div className="flex flex-wrap gap-2">
                    {CAREER_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => toggleCareer(option.value)}
                        className={`px-4 py-2 rounded-full text-[15px] border transition ${
                          selectedCareers.includes(option.value)
                            ? 'bg-green-600 text-white border-green-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedCategory === 'region' && (
                <div>
                  <div className="text-[15px] font-semibold text-gray-700 mb-3">지역 선택</div>
                  <div className="flex flex-wrap gap-2">
                    {options.regions.map(region => (
                      <button
                        key={region}
                        onClick={() => toggleRegion(region)}
                        className={`px-4 py-2 rounded-full text-[15px] border transition ${
                          selectedRegions.includes(region)
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                        }`}
                      >
                        {region}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedCategory === 'employment' && (
                <div>
                  <div className="text-[15px] font-semibold text-gray-700 mb-3">고용형태 선택</div>
                  <div className="flex flex-wrap gap-2">
                    {options.employee_types.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleEmploymentType(type)}
                        className={`px-4 py-2 rounded-full text-[15px] border transition ${
                          selectedEmploymentTypes.includes(type)
                            ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-[15px] text-gray-600">
            {selectedDepthTwos.length > 0 && (
              <span className="font-medium">
                직무 {selectedDepthTwos.length}개
              </span>
            )}
            {selectedDepthTwos.length > 0 && (selectedCareers.length > 0 || selectedRegions.length > 0 || selectedEmploymentTypes.length > 0) && (
              <span className="mx-2">·</span>
            )}
            {selectedCareers.length > 0 && (
              <span className="font-medium">
                경력 {selectedCareers.length}개
              </span>
            )}
            {selectedCareers.length > 0 && (selectedRegions.length > 0 || selectedEmploymentTypes.length > 0) && (
              <span className="mx-2">·</span>
            )}
            {selectedRegions.length > 0 && (
              <span className="font-medium">
                지역 {selectedRegions.length}개
              </span>
            )}
            {selectedRegions.length > 0 && selectedEmploymentTypes.length > 0 && (
              <span className="mx-2">·</span>
            )}
            {selectedEmploymentTypes.length > 0 && (
              <span className="font-medium">
                고용형태 {selectedEmploymentTypes.length}개
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline">
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedDepthTwos.length === 0}
              className="min-w-[120px]"
            >
              <Check className="w-4 h-4 mr-2" />
              {selectedDepthTwos.length > 0 ? `${selectedDepthTwos.length}개 공고 보기` : '직무를 선택하세요'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
