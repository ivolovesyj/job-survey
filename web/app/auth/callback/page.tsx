'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('로그인 처리 중...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase onAuthStateChange가 세션을 자동 감지할 때까지 대기
        // (implicit flow: hash fragment / PKCE: code exchange 모두 처리)
        const maxWait = 10000
        const interval = 500
        let elapsed = 0

        while (elapsed < maxWait) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            setStatus('로그인 성공! 확인 중...')

            // 신규 회원인지 확인 (user_preferences 존재 여부)
            const { data: prefs } = await supabase
              .from('user_preferences')
              .select('user_id')
              .eq('user_id', session.user.id)
              .single()

            // 세션이 확실히 저장된 후 이동
            await new Promise(r => setTimeout(r, 500))

            if (!prefs) {
              // 신규 회원 → 온보딩으로
              setStatus('환영합니다! 설정 중...')
              router.replace('/onboarding')
            } else {
              // 기존 회원 → 홈으로
              router.replace('/')
            }
            return
          }
          await new Promise(r => setTimeout(r, interval))
          elapsed += interval
        }

        // 타임아웃
        setStatus('로그인에 실패했습니다. 다시 시도해주세요.')
        setTimeout(() => router.replace('/login'), 2000)
      } catch (err) {
        console.error('[Auth Callback] Error:', err)
        setStatus('오류가 발생했습니다.')
        setTimeout(() => router.replace('/login'), 2000)
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
        <p className="mt-4 text-gray-600">{status}</p>
      </div>
    </div>
  )
}
