import { fetchSitemapIndex, fetchSitemapUrls, fetchJobDetail } from '../src/crawlers/zighang-full.js'

async function showSampleFields() {
  console.log('=== 직행 공고 샘플 필드 조회 ===\n')

  // 1. Sitemap에서 공고 URL 5개 가져오기
  const sitemaps = await fetchSitemapIndex()
  const firstSitemap = sitemaps[0]
  console.log(`사이트맵: ${firstSitemap}\n`)

  const entries = await fetchSitemapUrls(firstSitemap)
  console.log(`공고 ${entries.length}건 발견\n`)

  // 2. 처음 5개 공고 상세 정보 추출
  const samples = []
  for (let i = 0; i < Math.min(5, entries.length); i++) {
    console.log(`[${i + 1}/5] ${entries[i].url} 추출 중...`)
    const job = await fetchJobDetail(entries[i])
    if (job) {
      samples.push(job)
      console.log(`  ✓ ${job.company} - ${job.title}`)
    } else {
      console.log(`  ✗ 추출 실패`)
    }
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n=== 필드별 샘플 값 ===\n')

  // depth_ones 수집
  const allDepthOnes = new Set()
  samples.forEach(j => j.depth_ones?.forEach(d => allDepthOnes.add(d)))
  console.log('📌 depth_ones (직무 대분류):')
  console.log(Array.from(allDepthOnes))

  // depth_twos 수집
  const allDepthTwos = new Set()
  samples.forEach(j => j.depth_twos?.forEach(d => allDepthTwos.add(d)))
  console.log('\n📌 depth_twos (직무 소분류):')
  console.log(Array.from(allDepthTwos))

  // keywords 수집
  const allKeywords = new Set()
  samples.forEach(j => j.keywords?.forEach(k => allKeywords.add(k)))
  console.log('\n📌 keywords:')
  console.log(Array.from(allKeywords))

  console.log('\n=== 샘플 데이터 전체 구조 (1건) ===\n')
  console.log(JSON.stringify(samples[0], null, 2))
}

showSampleFields().catch(console.error)
