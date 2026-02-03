'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Briefcase, Search, Package } from 'lucide-react'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'

export default function ApplicationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center animate-bounce">
            <Package className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg font-medium text-gray-700">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navigation />

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">지원 관리</h2>
            <div className="text-sm text-gray-600">
              총 {applications.length}개
            </div>
          </div>

          {!user ? (
            // 비로그인 상태
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 mb-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <Briefcase className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                지원 관리를 시작하세요
              </h3>
              <p className="text-gray-600 mb-8 max-w-md">
                채용 공고를 둘러보거나, 다른 사이트에서 지원한 내역을 추가해보세요
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/jobs">
                  <Button size="lg" className="flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    채용공고 보러가기
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="flex items-center gap-2">
                    지원 내역 추가하기
                  </Button>
                </Link>
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
