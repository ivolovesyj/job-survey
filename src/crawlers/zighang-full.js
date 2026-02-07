import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://zighang.com';
const SITEMAP_INDEX_URL = `${BASE_URL}/seo/sitemap/sitemap-index.xml`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xml',
};

const DELAY_MS = 300; // 사이트맵 요청 간 딜레이
const CONCURRENCY = 5; // 상세 페이지 동시 요청 수
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
 * ProseMirror/TipTap JSON doc → 평문 텍스트 변환
 */
function prosemirrorToText(doc) {
  if (!doc || typeof doc === 'string') return doc || '';
  if (typeof doc !== 'object') return String(doc);

  function walk(node) {
    if (!node) return '';
    if (node.type === 'text') return node.text || '';
    if (!node.content) return '';
    const parts = node.content.map(walk);
    // 블록 노드 사이에 줄바꿈 추가
    const blockTypes = ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote'];
    if (blockTypes.includes(node.type)) {
      return parts.join('') + '\n';
    }
    return parts.join('');
  }
  return walk(doc).replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * 학력 정보 추출 헬퍼 함수
 * RSC 객체 또는 requirements 텍스트에서 학력 추출
 */
function extractEducation(recruitment, requirementsText) {
  // 1순위: RSC에 educations 배열이 있으면 직접 사용
  if (recruitment.educations && Array.isArray(recruitment.educations) && recruitment.educations.length > 0) {
    // 배열의 첫 번째 값 사용
    return normalizeEducation(recruitment.educations[0]);
  }
  
  // 2순위: RSC에 education 단수형 필드가 있으면 사용 (하위 호환성)
  if (recruitment.education && typeof recruitment.education === 'string') {
    return normalizeEducation(recruitment.education);
  }

  // 3순위: requirements 텍스트에서 학력 키워드 검색
  if (requirementsText) {
    const text = requirementsText.toLowerCase();
    
    // 학력무관
    if (text.includes('학력무관') || text.includes('학력 무관')) {
      return '무관';
    }
    
    // 박사
    if (text.includes('박사')) {
      return '박사';
    }
    
    // 석사
    if (text.includes('석사')) {
      return '석사';
    }
    
    // 학사/대졸
    if (text.includes('학사') || text.includes('대졸') || text.includes('대학교 졸업')) {
      return '학사';
    }
    
    // 전문대졸
    if (text.includes('전문대') || text.includes('전문학사')) {
      return '전문대졸';
    }
    
    // 고졸
    if (text.includes('고졸') || text.includes('고등학교')) {
      return '고졸';
    }
  }
  
  // 기본값: null (정보 없음)
  return null;
}

/**
 * 학력 정보 정규화 (다양한 표현을 표준 형식으로 변환)
 */
function normalizeEducation(education) {
  const normalized = education.trim();
  
  // 매핑 테이블
  const eduMap = {
    '무관': ['무관', '학력무관', '학력 무관', '제한없음'],
    '고졸': ['고졸', '고등학교', '고등학교 졸업'],
    '전문대졸': ['전문대졸', '전문대', '전문학사'],
    '학사': ['학사', '대졸', '대학 졸업', '대학교 졸업', '4년제'],
    '석사': ['석사', '석사 학위'],
    '박사': ['박사', '박사 학위'],
  };
  
  for (const [standard, variations] of Object.entries(eduMap)) {
    if (variations.some(v => normalized.includes(v))) {
      return standard;
    }
  }
  
  return normalized; // 매핑되지 않으면 원본 반환
}

/**
 * 평문 텍스트를 섹션 헤딩 기준으로 detail 필드로 분리
 */
function parseDetailSections(text) {
  const empty = { intro: '', main_tasks: '', requirements: '', preferred_points: '', benefits: '', work_conditions: '', raw_content: '' };
  if (!text) return empty;

  const sectionMap = {
    main_tasks: /^(담당업무|주요업무|업무\s*내용|직무\s*내용|하는\s*일|업무\s*소개|업무\s*설명|모집\s*정보|모집\s*분야)/,
    requirements: /^(자격요건|자격\s*조건|지원\s*자격|필수\s*요건|필수\s*조건|응모\s*자격|채용\s*조건|필요\s*역량|지원\s*조건)/,
    preferred_points: /^(우대사항|우대\s*조건|우대\s*요건|이런\s*분.*우대|이런\s*분.*환영|우대\s*역량)/,
    benefits: /^(복리후생|혜택|복지|근무\s*혜택|직원\s*혜택|사내\s*복지|복지\s*및|보상\s*및)/,
    work_conditions: /^(근무환경|근무\s*조건|근무\s*시간|근무\s*형태|급여|연봉|근무환경\/급여|처우\s*조건|모집\s*인원|모집\s*조건|근무\s*지역|근무\s*장소|근무\s*일시|근무\s*요일)/,
  };

  const lines = text.split('\n');
  const result = { intro: '', main_tasks: '', requirements: '', preferred_points: '', benefits: '', work_conditions: '', raw_content: text };
  let currentSection = 'intro';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result[currentSection] += '\n';
      continue;
    }

    let matched = false;
    for (const [key, regex] of Object.entries(sectionMap)) {
      if (regex.test(trimmed)) {
        currentSection = key;
        matched = true;
        break;
      }
    }

    // 제출서류, 전형절차, 접수방법, 마감기한 등 기타 섹션은 work_conditions에 포함
    if (!matched && /^(제출서류|전형절차|접수방법|마감기한|채용\s*절차|지원\s*방법|서류\s*접수|접수\s*기간|전형\s*방법)/.test(trimmed)) {
      currentSection = 'work_conditions';
      matched = true;
    }

    // 섹션 헤더 라인도 내용에 포함 (헤더 텍스트 뒤에 추가 정보가 있을 수 있으므로)
    result[currentSection] += trimmed + '\n';
  }

  // trim all
  for (const key of Object.keys(result)) {
    if (key === 'raw_content') continue;
    result[key] = result[key].replace(/\n{3,}/g, '\n\n').trim();
  }
  result.raw_content = result.raw_content.replace(/\n{3,}/g, '\n\n').trim();

  return result;
}

/**
 * 회사 상세 페이지에서 회사 유형 추출
 * @param {string} companyId - 회사 ID
 * @returns {Promise<{company_type: string}>}
 */
async function fetchCompanyDetail(companyId) {
  try {
    const companyUrl = `${BASE_URL}/company/${companyId}`;
    const response = await axios.get(companyUrl, {
      headers: {
        ...HEADERS,
        'Accept': 'text/html',
      },
      timeout: 10000,
    });

    const html = response.data;

    // RSC에서 metadata 추출
    const rscChunks = [];
    const regex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const decoded = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      rscChunks.push(decoded);
    }

    const fullRsc = rscChunks.join('');

    // 회사 유형 추출 (meta keywords에서)
    let company_type = '기타'; // 기본값 (정보 없을 때)
    const keywordsMatch = fullRsc.match(/\["\$","meta","3",\{"name":"keywords","content":"([^"]+)"\}\]/);
    if (keywordsMatch) {
      const keywords = keywordsMatch[1].split(',').map(k => k.trim());
      // 뒤에서 두 번째 항목이 회사 유형
      if (keywords.length >= 2) {
        const potentialType = keywords[keywords.length - 2];
        // 유효한 회사 유형인지 확인
        const validTypes = ['대기업', '중견기업', '중소기업', '스타트업', '유니콘', '외국계', '공공기관'];
        if (validTypes.includes(potentialType)) {
          company_type = potentialType;
        }
      }
    }

    return { company_type };
  } catch (error) {
    console.error(`회사 상세 정보 크롤링 실패 (${companyId}):`, error.message);
    // NULL 방지: 에러 시에도 반드시 객체 반환
    return { company_type: '기타' };
  }
}

/**
 * RSC flight data에서 "recruitment":{...} JSON 객체 추출
 */
function extractRecruitmentFromRsc(html) {
  // RSC chunks를 디코딩하여 합치기
  const rscChunks = [];
  const regex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const decoded = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
    rscChunks.push(decoded);
  }
  const fullRsc = rscChunks.join('');

  // "recruitment":{ 위치 찾기
  const recruitStart = fullRsc.indexOf('"recruitment":{');
  if (recruitStart === -1) return null;

  // 중괄호 매칭으로 JSON 객체 범위 추출
  const objStart = recruitStart + '"recruitment":'.length;
  let depth = 0;
  let objEnd = objStart;
  for (let i = objStart; i < fullRsc.length; i++) {
    if (fullRsc[i] === '{') depth++;
    else if (fullRsc[i] === '}') {
      depth--;
      if (depth === 0) {
        objEnd = i + 1;
        break;
      }
    }
  }

  try {
    return JSON.parse(fullRsc.substring(objStart, objEnd));
  } catch {
    return null;
  }
}

/**
 * 4. 상세 페이지에서 공고 데이터 추출
 *    RSC flight data에서 "recruitment":{...} JSON 추출
 *    fallback: LD+JSON + OG 태그
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

    const html = response.data;
    const $ = cheerio.load(html);

    // 1차: RSC flight data에서 풍부한 데이터 추출
    const recruitment = extractRecruitmentFromRsc(html);

    if (recruitment) {
      // summary/content를 평문 변환 후 섹션 분리
      const contentText = prosemirrorToText(recruitment.content) || prosemirrorToText(recruitment.summary) || $('meta[property="og:description"]').attr('content') || '';
      const detail = parseDetailSections(contentText);
      
      // 학력 정보 추출 (RSC 또는 자격요건에서)
      const education = extractEducation(recruitment, detail.requirements);
      
      // 회사 유형 추출 (hasDetailInfo 분기 처리)
      let company_type = '기타'; // 기본값 (정보 없을 때)

      const companyId = recruitment.company?.id;
      const hasDetailInfo = recruitment.company?.hasDetailInfo;

      if (companyId && hasDetailInfo === true) {
        // hasDetailInfo가 true면 회사 상세 페이지 크롤링
        console.log(`  ℹ️  회사 상세 정보 크롤링: ${recruitment.company?.name} (${companyId})`);
        try {
          const companyDetail = await fetchCompanyDetail(companyId);
          // NULL 방지: company_type이 유효한 값인지 확인
          if (companyDetail && companyDetail.company_type) {
            company_type = companyDetail.company_type;
          } else {
            console.log(`  ⚠️  회사 유형 추출 실패, 기본값 '기타' 사용`);
          }
        } catch (error) {
          console.error(`  ❌ fetchCompanyDetail 에러: ${error.message}`);
          company_type = '기타'; // 에러 시 명시적으로 '기타' 설정
        }
      } else {
        // hasDetailInfo가 false이거나 없으면 기본값 '기타' 유지
        console.log(`  ⚠️  회사 상세 정보 없음, 기본값 '기타' 사용: ${recruitment.company?.name}`);
      }
      
      return {
        id: entry.id,
        source: 'zighang',

        company: recruitment.company?.name || '정보없음',
        company_id: companyId || null,
        company_image: recruitment.company?.image || null,
        company_type,  // 추가: 회사 유형

        title: recruitment.title || '제목없음',
        regions: recruitment.regions || [],
        location: recruitment.regions?.[0] || '',
        career_min: recruitment.careerMin ?? null,
        career_max: recruitment.careerMax ?? null,
        employee_types: recruitment.employeeTypes || [],
        deadline_type: recruitment.deadlineType || null,
        end_date: recruitment.endDate || null,

        depth_ones: recruitment.depthOnes || [],
        depth_twos: recruitment.depthTwos || [],
        keywords: recruitment.keywords || [],

        views: recruitment.views || 0,
        detail,
        
        // 학력 정보 추가
        education,

        original_created_at: recruitment.createdAt || null,
        last_modified_at: entry.lastmod?.toISOString() || null,
        crawled_at: new Date().toISOString(),

        is_active: recruitment.status === 'ACTIVE',
      };
    }

    // 2차 fallback: LD+JSON
    let jobPosting = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html());
        if (data['@type'] === 'JobPosting') jobPosting = data;
      } catch {}
    });

    if (!jobPosting) return null;

    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogDesc = $('meta[property="og:description"]').attr('content') || '';

    let depthOnes = [];
    const titleMatch = ogTitle.match(/\[.+?\]\s*.+?\s*채용\s*\|\s*(.+)/);
    if (titleMatch) depthOnes = [titleMatch[1].trim()];

    const typeMap = { 'FULL_TIME': '정규직', 'PART_TIME': '파트타임', 'CONTRACT': '계약직', 'INTERN': '인턴' };
    const employeeTypes = (jobPosting.employmentType || []).map(t => typeMap[t] || t);
    const locations = (jobPosting.jobLocation || []).map(loc => loc?.address?.addressLocality || '').filter(Boolean);

    return {
      id: entry.id,
      source: 'zighang',

      company: jobPosting.hiringOrganization?.name || '정보없음',
      company_id: null,
      company_image: null,
      company_type: '기타',  // fallback 기본값 (정보 없을 때)

      title: jobPosting.title || '제목없음',
      regions: locations,
      location: locations[0] || '',
      career_min: null,
      career_max: null,
      employee_types: employeeTypes,
      deadline_type: null,
      end_date: null,

      depth_ones: depthOnes,
      depth_twos: [],
      keywords: [],

      views: 0,

      detail: { intro: '', main_tasks: ogDesc || '', requirements: '', preferred_points: '', benefits: '', work_conditions: '', raw_content: ogDesc || '' },
      
      education: null,  // fallback에서는 학력 정보 없음

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
export async function crawlAll({ sinceDate = null, existingIds = null, resumeFrom = 0, onBatch = null, onProgress = null } = {}) {
  console.log('\n🚀 직항 전체 공고 크롤링 시작');
  console.log(`   모드: ${sinceDate ? `증분 (${sinceDate} 이후)` : '전체'}`);
  if (resumeFrom > 0) {
    console.log(`   재개: ${resumeFrom}번째부터 시작`);
  }
  console.log(`   시간: ${new Date().toLocaleString('ko-KR')}\n`);

  // 1. 전체 URL 수집 (사이트맵 diff용으로 전체 ID도 확보)
  const allEntries = await fetchAllJobUrls(null); // 항상 전체 사이트맵 수집
  const allSitemapIds = new Set(allEntries.map(e => e.id));

  // 증분 모드면 sinceDate 이후만 상세 크롤링
  let entries = allEntries;
  if (sinceDate) {
    const since = new Date(sinceDate);
    entries = allEntries.filter(e => e.lastmod && e.lastmod > since);
    console.log(`📊 증분 필터 (${sinceDate} 이후): ${entries.length}건`);
  }

  // 이미 DB에 있는 공고 스킵 (중단 후 재개 시)
  let skipped = 0;
  if (existingIds && existingIds.size > 0) {
    const before = entries.length;
    entries = entries.filter(e => !existingIds.has(e.id));
    skipped = before - entries.length;
    console.log(`⏩ 이미 수집된 공고 스킵: ${skipped}건 (잔여: ${entries.length}건)`);
  }

  if (entries.length === 0) {
    console.log('📭 수집할 공고가 없습니다.');
    return { total: 0, success: 0, failed: 0, deleted: 0, skipped, allSitemapIds };
  }

  // 2. 상세 페이지 크롤링 + 배치 저장 (동시 요청)
  let success = 0;
  let failed = 0;
  let deleted = 0;
  let batch = [];
  let processed = 0;

  // 재개 모드: 이미 처리된 부분 스킵
  const startIndex = resumeFrom || 0;
  if (startIndex > 0) {
    console.log(`⏩ ${startIndex}개 스킵 (이미 처리됨)`);
  }

  for (let i = startIndex; i < entries.length; i += CONCURRENCY) {
    const chunk = entries.slice(i, i + CONCURRENCY);
    const jobs = await Promise.all(chunk.map(entry => fetchJobDetail(entry)));

    for (const job of jobs) {
      processed++;
      if (job) {
        if (job._deleted) {
          deleted++;
          batch.push({ id: job.id, is_active: false });
        } else {
          success++;
          batch.push(job);
        }
      } else {
        failed++;
      }
    }

    // 배치 크기 도달 시 콜백 호출
    if (batch.length >= BATCH_SIZE) {
      if (onBatch) await onBatch(batch);
      batch = [];
    }

    // 진행 상태 출력 및 콜백
    const totalProcessed = startIndex + processed;
    if (totalProcessed % 100 < CONCURRENCY || i + CONCURRENCY >= entries.length) {
      const progress = `${totalProcessed}/${entries.length}`;
      const lastProcessedId = chunk[chunk.length - 1]?.id;
      const stats = `성공: ${success}, 실패: ${failed}, 삭제: ${deleted}`;
      console.log(`  📈 [${progress}] ${stats}`);
      if (onProgress) await onProgress({ current: totalProcessed, total: entries.length, success, failed, deleted, lastProcessedId });
    }

    await sleep(200); // 동시 요청 간 짧은 딜레이 (서버 부하 방지)
  }

  // 남은 배치 처리
  if (batch.length > 0 && onBatch) {
    await onBatch(batch);
  }

  const result = { total: entries.length, success, failed, deleted, allSitemapIds };
  console.log(`\n✅ 크롤링 완료: 총 ${entries.length}건, 성공 ${success}, 실패 ${failed}, 삭제 ${deleted}`);
  console.log(`   사이트맵 전체 ID: ${allSitemapIds.size}건`);
  return result;
}
