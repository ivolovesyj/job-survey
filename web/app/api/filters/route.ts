import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 직무 카테고리와 지역 옵션을 DB에서 가져오기
export async function GET(request: Request) {
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

    // 활성 공고에서 고유한 depth_ones, depth_twos, regions 추출
    const { data: jobs } = await supabase
      .from('jobs')
      .select('depth_ones, depth_twos, regions, employee_types')
      .eq('is_active', true)

    const depthOnesSet = new Set<string>()
    const depthTwosMap = new Map<string, Set<string>>() // depth_one → Set<depth_two>
    const regionsSet = new Set<string>()
    const employeeTypesSet = new Set<string>()

    jobs?.forEach(job => {
      job.depth_ones?.forEach((d: string) => {
        depthOnesSet.add(d)

        // 해당 depth_one의 depth_twos 수집
        if (!depthTwosMap.has(d)) {
          depthTwosMap.set(d, new Set())
        }
        job.depth_twos?.forEach((dt: string) => {
          depthTwosMap.get(d)!.add(dt)
        })
      })

      job.regions?.forEach((r: string) => {
        // 지역을 시/도 단위로 그룹화
        const city = r.split(' ')[0]
        regionsSet.add(city)
      })
      job.employee_types?.forEach((t: string) => employeeTypesSet.add(t))
    })

    // Map을 객체로 변환
    const depthTwosObj: Record<string, string[]> = {}
    depthTwosMap.forEach((twosSet, one) => {
      depthTwosObj[one] = Array.from(twosSet).sort()
    })

    return NextResponse.json({
      depth_ones: Array.from(depthOnesSet).sort(),
      depth_twos_map: depthTwosObj, // { "개발": ["프론트엔드", "백엔드"], ... }
      regions: Array.from(regionsSet).sort(),
      employee_types: Array.from(employeeTypesSet).sort(),
    })
  } catch (error) {
    console.error('Filters error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
