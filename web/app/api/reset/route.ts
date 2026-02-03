import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 순서 중요: FK 의존성 순으로 삭제
    const results = await Promise.all([
      supabase.from('application_status').delete().eq('user_id', user.id),
      supabase.from('keyword_weights').delete().eq('user_id', user.id),
      supabase.from('company_preference').delete().eq('user_id', user.id),
    ])

    // saved_jobs, user_job_actions는 application_status 삭제 후
    await supabase.from('saved_jobs').delete().eq('user_id', user.id)
    await supabase.from('user_job_actions').delete().eq('user_id', user.id)

    // user_preferences는 초기화 (행 삭제)
    await supabase.from('user_preferences').delete().eq('user_id', user.id)

    return NextResponse.json({ success: true, message: 'All user data reset to initial state' })
  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
}
