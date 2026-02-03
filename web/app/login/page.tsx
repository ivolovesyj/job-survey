'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Navigation } from '@/components/Navigation'

export default function LoginPage() {
  const { user, loading, signInWithKakao } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // 이미 로그인되어 있으면 메인으로 리다이렉트
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleKakaoLogin = async () => {
    try {
      await signInWithKakao()
    } catch (error) {
      console.error('Login failed:', error)
      alert('로그인에 실패했습니다. 다시 시도해주세요.')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navigation />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto">
            <Image src="/logo-final.png" alt="지원함" width={128} height={128} className="w-full h-full object-contain" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">지원함</h1>
          <p className="mt-2 text-gray-600">
            모든 지원 내역을 한곳에서 체계적으로
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">로그인</h2>
            <p className="mt-2 text-sm text-gray-600">
              카카오 계정으로 간편하게 시작하세요
            </p>
          </div>

          <Button
            onClick={handleKakaoLogin}
            className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] font-semibold py-6 text-base"
          >
            <svg
              className="mr-2 h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.442 1.483 4.602 3.772 6.033L4.5 21l5.106-2.553C10.37 18.803 11.168 19 12 19c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
            </svg>
            카카오로 계속하기
          </Button>

          <div className="text-center text-xs text-gray-500">
            로그인하면 서비스 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
