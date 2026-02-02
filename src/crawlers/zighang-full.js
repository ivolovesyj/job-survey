import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://zighang.com';
const SITEMAP_INDEX_URL = `${BASE_URL}/seo/sitemap/sitemap-index.xml`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xml',
};

const DELAY_MS = 500; // 요청 간 딜레이
const DETAIL_DELAY_MS = 500;
const BATCH_SIZE = 50; // Supabase upsert 배치 크기

/**
 * 딜레이 헬퍼
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 1. sitemap-index.xml에서 recruitment sitemap URL 목록 가져오기
 */
export async function fetchSitemapIndex() {
  const response = await axios.get(SITEMAP_INDEX_URL, {
    headers: HEADERS,
    timeout: 15000,
  });

  const $ = cheerio.load(response.data, { xmlMode: true });
  const sitemapUrls = [];

  $('sitemap').each((_, el) => {
    const loc = $(el).find('loc').text().trim();
    if (loc.includes('sitemap-recruitment')) {
      sitemapUrls.push(loc);
    }
  });

  console.log(`📋 Sitemap index: ${sitemapUrls.length}개 recruitment sitemap 발견`);
  return sitemapUrls;
}

/**
 * 2. 개별 sitemap XML에서 공고 URL + lastmod 추출
 */
export async function fetchSitemapUrls(sitemapUrl) {
  const response = await axios.get(sitemapUrl, {
    headers: HEADERS,
    timeout: 15000,
  });

  const $ = cheerio.load(response.data, { xmlMode: true });
  const entries = [];

  $('url').each((_, el) => {
    const loc = $(el).find('loc').text().trim();
    const lastmod = $(el).find('lastmod').text().trim();

    // /recruitment/UUID 패턴만 추출
    const match = loc.match(/\/recruitment\/([a-f0-9-]+)$/);
    if (match) {
      entries.push({
        id: match[1],
        url: loc,
        lastmod: lastmod ? new Date(lastmod) : null,
      });
    }
  });

  return entries;
}

/**
 * 3. 전체 sitemap에서 모든 공고 URL 수집
 *    sinceDate가 주어지면 해당 날짜 이후 수정된 것만 반환 (증분 크롤링)
 */
export async function fetchAllJobUrls(sinceDate = null) {
  const sitemapUrls = await fetchSitemapIndex();
  let allEntries = [];

  for (const sitemapUrl of sitemapUrls) {
    try {
      const entries = await fetchSitemapUrls(sitemapUrl);
      allEntries.push(...entries);
      console.log(`  ✓ ${sitemapUrl.split('/').pop()}: ${entries.length}건`);
      await sleep(DELAY_MS);
    } catch (error) {
      console.error(`  ✗ ${sitemapUrl}: ${error.message}`);
    }
  }

  console.log(`\n📊 전체 공고 URL: ${allEntries.length}건`);

  // 증분 크롤링: sinceDate 이후 수정된 것만
  if (sinceDate) {
    const since = new Date(sinceDate);
    const filtered = allEntries.filter(e => e.lastmod && e.lastmod > since);
    console.log(`📊 증분 필터 (${sinceDate} 이후): ${filtered.length}건`);
    return filtered;
  }

  return allEntries;
}

/**
 * 4. 상세 페이지에서 공고 데이터 추출
 *    직항이 Next.js App Router(RSC)로 전환되어 __NEXT_DATA__가 없음
 *    → LD+JSON (schema.org/JobPosting) + OG 태그 + meta description에서 추출
 */
export async function fetchJobDetail(entry) {
  try {
    const response = await axios.get(entry.url, {
      headers: {
        ...HEADERS,
        'Accept': 'text/html',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // 1. LD+JSON에서 JobPosting 데이터 추출
    let jobPosting = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data['@type'] === 'JobPosting') jobPosting = data;
      } catch {}
    });

    if (!jobPosting) {
      return null;
    }

    // 2. OG title 파싱: [회사명] 공고제목 채용 | 직군분류
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || null;

    let depthOnes = [];
    const titleMatch = ogTitle.match(/\[.+?\]\s*.+?\s*채용\s*\|\s*(.+)/);
    if (titleMatch) {
      depthOnes = [titleMatch[1].trim()];
    }

    // 3. employmentType 변환
    const typeMap = { 'FULL_TIME': '정규직', 'PART_TIME': '파트타임', 'CONTRACT': '계약직', 'INTERN': '인턴' };
    const employeeTypes = (jobPosting.employmentType || []).map(t => typeMap[t] || t);

    // 4. 위치 추출
    const locations = (jobPosting.jobLocation || []).map(loc =>
      loc?.address?.addressLocality || ''
    ).filter(Boolean);

    return {
      id: entry.id,
      source: 'zighang',

      // 회사 정보
      company: jobPosting.hiringOrganization?.name || '',
      company_image: ogImage,

      // 공고 기본 정보
      title: jobPosting.title || '',
      regions: locations,
      location: locations[0] || '',
      career_min: null, // LD+JSON에는 경력 정보 없음
      career_max: null,
      employee_types: employeeTypes,
      deadline_type: null,
      end_date: null,

      // 직군 분류
      depth_ones: depthOnes,
      depth_twos: [],
      keywords: [],

      // 조회수
      views: 0,

      // 상세 정보 (OG description에 담당업무/자격요건 등이 텍스트로 포함)
      detail: {
        intro: '',
        main_tasks: ogDesc || '',
        requirements: '',
        preferred_points: '',
        benefits: '',
        work_conditions: '',
      },

      // 타임스탬프
      original_created_at: jobPosting.datePosted || null,
      last_modified_at: entry.lastmod?.toISOString() || null,
      crawled_at: new Date().toISOString(),

      is_active: true,
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return { id: entry.id, _deleted: true };
    }
    console.error(`  ✗ ${entry.id}: ${error.message}`);
    return null;
  }
}

/**
 * 5. 전체 크롤링 실행
 *    - sinceDate: 증분 크롤링 기준일 (null이면 전체)
 *    - onBatch: 배치 콜백 (Supabase 저장용)
 *    - onProgress: 진행 상태 콜백
 */
export async function crawlAll({ sinceDate = null, onBatch = null, onProgress = null } = {}) {
  console.log('\n🚀 직항 전체 공고 크롤링 시작');
  console.log(`   모드: ${sinceDate ? `증분 (${sinceDate} 이후)` : '전체'}`);
  console.log(`   시간: ${new Date().toLocaleString('ko-KR')}\n`);

  // 1. 전체 URL 수집
  const entries = await fetchAllJobUrls(sinceDate);

  if (entries.length === 0) {
    console.log('📭 수집할 공고가 없습니다.');
    return { total: 0, success: 0, failed: 0, deleted: 0 };
  }

  // 2. 상세 페이지 크롤링 + 배치 저장
  let success = 0;
  let failed = 0;
  let deleted = 0;
  let batch = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const job = await fetchJobDetail(entry);

    if (job) {
      if (job._deleted) {
        deleted++;
        // 삭제된 공고도 배치에 포함 (is_active=false 처리)
        batch.push({ id: job.id, is_active: false });
      } else {
        success++;
        batch.push(job);
      }
    } else {
      failed++;
    }

    // 배치 크기 도달 시 콜백 호출
    if (batch.length >= BATCH_SIZE) {
      if (onBatch) await onBatch(batch);
      batch = [];
    }

    // 진행 상태 출력
    if ((i + 1) % 100 === 0 || i === entries.length - 1) {
      const progress = `${i + 1}/${entries.length}`;
      const stats = `성공: ${success}, 실패: ${failed}, 삭제: ${deleted}`;
      console.log(`  📈 [${progress}] ${stats}`);
      if (onProgress) onProgress({ current: i + 1, total: entries.length, success, failed, deleted });
    }

    await sleep(DETAIL_DELAY_MS);
  }

  // 남은 배치 처리
  if (batch.length > 0 && onBatch) {
    await onBatch(batch);
  }

  const result = { total: entries.length, success, failed, deleted };
  console.log(`\n✅ 크롤링 완료: ${JSON.stringify(result)}`);
  return result;
}
