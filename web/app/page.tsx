'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Briefcase, Search, Package, X } from 'lucide-react'
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

// 비로그인 사용자를 위한 샘플 데이터
const SAMPLE_APPLICATIONS = [
  {
    id: 'sample-1',
    company: '토스',
    title: '프론트엔드 개발자',
    location: '서울',
    deadline: '2024-03-31',
    status: 'pending',
    link: '#',
  },
  {
    id: 'sample-2',
    company: '카카오',
    title: 'React 개발자',
    location: '판교',
    deadline: '2024-03-25',
    status: 'hold',
    link: '#',
  },
  {
    id: 'sample-3',
    company: '네이버',
    title: '웹 프론트엔드 개발',
    location: '성남',
    deadline: '2024-04-05',
    status: 'applied',
    link: '#',
  },
]

export default function ApplicationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessage] = useState(() => getRandomLoadingMessage())
  const initialLoadStartRef = useRef<number>(Date.now())
  const [minLoadingComplete, setMinLoadingComplete] = useState(false)
  const [showHeroBanner, setShowHeroBanner] = useState(true)
  const [mounted, setMounted] = useState(false)

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true)
  }, [])

  // 최소 로딩 시간 보장 (1초)
  useEffect(() => {
    const minLoadingTime = 1000
    const elapsed = Date.now() - initialLoadStartRef.current
    const remaining = Math.max(0, minLoadingTime - elapsed)

    const timer = setTimeout(() => {
      setMinLoadingComplete(true)
    }, remaining)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      fetchApplications()
    } else if (!authLoading && !user) {
      setLoading(false)
    }
  }, [user, authLoading])

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_jobs')
        .select(`
          *,
          application_status (
            status,
            applied_at,
            rejected_at
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
    }
  }

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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">지원 관리</h2>
            <div className="text-sm text-gray-600">
              총 {applications.length}개
            </div>
          </div>

          {!user ? (
              // 비로그인 상태 - 샘플 데이터로 구조 미리보기
              <div className="relative min-h-[500px]">
              {/* 샘플 카드들 먼저 배치 */}
              <div className="grid gap-4">
                {SAMPLE_APPLICATIONS.map((app) => (
                  <div key={app.id} className="bg-white rounded-lg border p-4 opacity-30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900">{app.company}</h3>
                        <p className="text-gray-700 mt-1">{app.title}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                          <span>{app.location}</span>
                          <span>마감: {new Date(app.deadline).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          app.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                          app.status === 'hold' ? 'bg-gray-100 text-gray-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {app.status === 'pending' ? '지원 예정' :
                           app.status === 'hold' ? '보류' : '지원 완료'}
                        </span>
                        <Button variant="outline" size="sm" disabled>
                          원문 보기
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 오버레이 (그 위에) */}
              <div className="absolute top-0 left-0 right-0 bottom-0 bg-gray-50/90 backdrop-blur-sm flex items-center justify-center z-10">
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
                <Button size="lg" variant="outline" className="flex items-center gap-2">
                  지원 내역 직접 추가
                </Button>
              </div>
            </div>
          ) : (
            // 지원 목록
            <div className="grid gap-4">
              {applications.map((app) => (
                <div key={app.id} className="bg-white rounded-lg border p-4 hover:shadow-md transition">
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
                        app.application_status?.[0]?.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                        app.application_status?.[0]?.status === 'passed' ? 'bg-red-100 text-red-700' :
                        app.application_status?.[0]?.status === 'hold' ? 'bg-gray-100 text-gray-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {app.application_status?.[0]?.status === 'pending' ? '지원 예정' :
                         app.application_status?.[0]?.status === 'passed' ? '지원 안 함' :
                         app.application_status?.[0]?.status === 'hold' ? '보류' : '지원 완료'}
                      </span>
                      {app.link && (
                        <a href={app.link} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            원문 보기
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
