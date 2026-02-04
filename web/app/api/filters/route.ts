import { NextResponse } from 'next/server'
import { JOB_CATEGORIES, EMPLOYMENT_TYPES, COMPANY_TYPES, REGIONS } from '@/lib/filter-master-data'

// 필터 옵션을 고정된 마스터 데이터에서 가져오기
// DB 실시간 추출 대신 사용하여 UI 안정성 보장
export async function GET(request: Request) {
  try {
    // 직무 카테고리 변환: { "개발": ["프론트엔드", "백엔드", ...] }
    const depthTwosMap: Record<string, string[]> = {}
    Object.entries(JOB_CATEGORIES).forEach(([category, subCategories]) => {
      depthTwosMap[category] = [...subCategories].sort()
    })

    return NextResponse.json({
      depth_ones: Object.keys(JOB_CATEGORIES).sort(),
      depth_twos_map: depthTwosMap,
      regions: [...REGIONS],
      employee_types: [...EMPLOYMENT_TYPES],
      company_types: [...COMPANY_TYPES],
    })
  } catch (error) {
    console.error('Filters error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
