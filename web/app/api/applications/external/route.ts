import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/applications/external
 * 외부 URL에서 OG 태그 기반으로 공고 메타데이터 파싱
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL이 필요합니다.' }, { status: 400 })
    }

    // URL 검증
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: '올바른 URL이 아닙니다.' }, { status: 400 })
    }

    // 페이지 fetch
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `페이지를 불러올 수 없습니다. (${response.status})` },
        { status: 400 }
      )
    }

    const html = await response.text()

    // OG 태그 + 메타 태그 파싱 (간단한 regex 기반)
    const getOg = (property: string): string | null => {
      const match = html.match(new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i'))
      return match ? match[1] : null
    }

    const getMeta = (name: string): string | null => {
      const match = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'))
      return match ? match[1] : null
    }

    const getTitle = (): string => {
      const ogTitle = getOg('title')
      if (ogTitle) return ogTitle
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      return titleMatch ? titleMatch[1].trim() : ''
    }

    // 사이트별 회사명 추출 로직
    const extractCompany = (): string => {
      const ogSite = getOg('site_name')
      const hostname = parsedUrl.hostname

      // 직항: title에서 [회사명] 패턴
      const bracketMatch = getTitle().match(/^\[([^\]]+)\]/)
      if (bracketMatch) return bracketMatch[1]

      // 원티드: og:title이 "공고명 | 회사명" 형태
      if (hostname.includes('wanted.co.kr')) {
        const parts = getTitle().split('|')
        if (parts.length >= 2) return parts[parts.length - 1].trim()
      }

      // 사람인: og:description에 회사명 포함 경우가 많음
      if (hostname.includes('saramin.co.kr')) {
        const desc = getOg('description') || ''
        const compMatch = desc.match(/^([^,\-|]+)/)
        if (compMatch) return compMatch[1].trim()
      }

      return ogSite || hostname
    }

    const title = getTitle()
      .replace(/^\[[^\]]+\]\s*/, '') // [회사명] 제거
      .replace(/\s*\|.*$/, '') // | 뒤 제거
      .replace(/\s*-\s*채용.*$/, '') // - 채용... 제거
      .trim()

    const result = {
      title,
      company: extractCompany(),
      location: getMeta('location') || '',
      deadline: null as string | null,
      description: getOg('description') || getMeta('description') || '',
      link: url,
      image: getOg('image') || null,
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('External URL parse error:', error)
    return NextResponse.json(
      { error: '파싱에 실패했습니다. 수동으로 입력해주세요.' },
      { status: 500 }
    )
  }
}
