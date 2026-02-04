import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 직무 카테고리와 지역 옵션을 DB에서 가져오기
export async function GET(request: Request) {
  try {
    // 비로그인 사용자도 필터 옵션을 볼 수 있도록 인증 체크 제거
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 활성 공고에서 고유한 depth_ones, depth_twos, regions, employee_types, company_type 추출
    const { data: jobs } = await supabase
      .from('jobs')
      .select('depth_ones, depth_twos, regions, employee_types, company_type')
      .eq('is_active', true)

    const depthOnesSet = new Set<string>()
    const depthTwosMap = new Map<string, Set<string>>() // depth_one → Set<depth_two>
    const regionsSet = new Set<string>()
    const employeeTypesSet = new Set<string>()
    const companyTypesSet = new Set<string>()

    jobs?.forEach(job => {
      job.depth_ones?.forEach((d: string) => {
        // _ 를 · 로 변경
        const displayName = d.replace(/_/g, '·')
        depthOnesSet.add(displayName)

        // 해당 depth_one의 depth_twos 수집
        if (!depthTwosMap.has(displayName)) {
          depthTwosMap.set(displayName, new Set())
        }
        job.depth_twos?.forEach((dt: string) => {
          // _ 를 · 로 변경
          const displayDepthTwo = dt.replace(/_/g, '·')
          depthTwosMap.get(displayName)!.add(displayDepthTwo)
        })
      })

      job.regions?.forEach((r: string) => {
        // 지역을 시/도 단위로 그룹화
        const city = r.split(' ')[0]
        regionsSet.add(city)
      })
      job.employee_types?.forEach((t: string) => employeeTypesSet.add(t))

      // company_type 수집
      if (job.company_type) {
        companyTypesSet.add(job.company_type)
      }
    })

    // Map을 객체로 변환
    const depthTwosObj: Record<string, string[]> = {}
    depthTwosMap.forEach((twosSet, one) => {
      depthTwosObj[one] = Array.from(twosSet).sort()
    })

    // 고용형태 순서 및 허용 목록 정의
    const allowedEmployeeTypes = ['정규직', '인턴', '계약직', '프리랜서', '일용직', '병역특례']
    const employeeTypeOrder = allowedEmployeeTypes

    const filteredEmployeeTypes = Array.from(employeeTypesSet)
      .filter(type => allowedEmployeeTypes.includes(type)) // 허용 목록에 있는 것만
      .sort((a, b) => {
        const indexA = employeeTypeOrder.indexOf(a);
        const indexB = employeeTypeOrder.indexOf(b);
        return indexA - indexB;
      })

    // 기업 유형에 "기타" 추가 (매칭 안 된 회사들)
    const companyTypesArray = Array.from(companyTypesSet).sort()
    companyTypesArray.push('기타')

    return NextResponse.json({
      depth_ones: Array.from(depthOnesSet).sort(),
      depth_twos_map: depthTwosObj, // { "개발": ["프론트엔드", "백엔드"], ... }
      regions: Array.from(regionsSet).sort(),
      employee_types: filteredEmployeeTypes,
      company_types: companyTypesArray,
    })
  } catch (error) {
    console.error('Filters error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
