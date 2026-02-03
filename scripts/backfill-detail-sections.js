/**
 * 기존 jobs 테이블의 detail 필드를 후처리하는 스크립트.
 *
 * 1) raw_content가 없는 모든 job에 대해: 기존 필드들을 합쳐 raw_content 생성
 * 2) raw_content 기반으로 섹션 재파싱 (개선된 regex 적용)
 *
 * Usage: node scripts/backfill-detail-sections.js
 * Env: SUPABASE_URL, SUPABASE_SERVICE_KEY
 */

import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_KEY 환경변수 필요');
  process.exit(1);
}

const sectionMap = {
  main_tasks: /^(담당업무|주요업무|업무\s*내용|직무\s*내용|하는\s*일|업무\s*소개|업무\s*설명|모집\s*정보|모집\s*분야)/,
  requirements: /^(자격요건|자격\s*조건|지원\s*자격|필수\s*요건|필수\s*조건|응모\s*자격|채용\s*조건|필요\s*역량|지원\s*조건)/,
  preferred_points: /^(우대사항|우대\s*조건|우대\s*요건|이런\s*분.*우대|이런\s*분.*환영|우대\s*역량)/,
  benefits: /^(복리후생|혜택|복지|근무\s*혜택|직원\s*혜택|사내\s*복지|복지\s*및|보상\s*및)/,
  work_conditions: /^(근무환경|근무\s*조건|근무\s*시간|근무\s*형태|급여|연봉|근무환경\/급여|처우\s*조건|모집\s*인원|모집\s*조건|근무\s*지역|근무\s*장소|근무\s*일시|근무\s*요일)/,
};

function parseDetailSections(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const result = { intro: '', main_tasks: '', requirements: '', preferred_points: '', benefits: '', work_conditions: '', raw_content: text };
  let currentSection = 'intro';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { result[currentSection] += '\n'; continue; }

    let matched = false;
    for (const [key, regex] of Object.entries(sectionMap)) {
      if (regex.test(trimmed)) { currentSection = key; matched = true; break; }
    }
    if (!matched && /^(제출서류|전형절차|접수방법|마감기한|채용\s*절차|지원\s*방법|서류\s*접수|접수\s*기간|전형\s*방법)/.test(trimmed)) {
      currentSection = 'work_conditions'; matched = true;
    }

    // 섹션 헤더 라인도 포함
    result[currentSection] += trimmed + '\n';
  }

  for (const key of Object.keys(result)) {
    if (key === 'raw_content') continue;
    result[key] = result[key].replace(/\n{3,}/g, '\n\n').trim();
  }
  result.raw_content = result.raw_content.replace(/\n{3,}/g, '\n\n').trim();
  return result;
}

/**
 * 기존 detail의 모든 필드를 합쳐서 raw_content 텍스트를 복원
 */
function mergeDetailToRawContent(detail) {
  if (!detail) return '';
  // 이미 raw_content가 있으면 그대로 사용
  if (detail.raw_content) return detail.raw_content;

  const parts = [];
  const fieldOrder = ['intro', 'main_tasks', 'requirements', 'preferred_points', 'benefits', 'work_conditions'];
  for (const field of fieldOrder) {
    const val = detail[field]?.trim();
    if (val) parts.push(val);
  }
  return parts.join('\n\n');
}

// --- main ---
async function supabaseRpc(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'PATCH' ? 'return=minimal' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  if (method === 'GET') return res.json();
  return null;
}

const BATCH = 500;
let offset = 0;
let updated = 0;
let total = 0;

console.log('⏳ detail raw_content 백필 + 섹션 재파싱 시작...');

while (true) {
  const jobs = await supabaseRpc('GET',
    `jobs?select=id,detail&order=id&limit=${BATCH}&offset=${offset}`
  );
  if (!jobs.length) break;
  total += jobs.length;

  for (const job of jobs) {
    if (!job.detail) continue;
    // raw_content가 이미 있으면 스킵
    if (job.detail.raw_content) continue;

    const rawContent = mergeDetailToRawContent(job.detail);
    if (!rawContent) continue;

    // raw_content 기반으로 재파싱
    const parsed = parseDetailSections(rawContent);
    if (!parsed) continue;

    await supabaseRpc('PATCH', `jobs?id=eq.${job.id}`, { detail: parsed });
    updated++;
  }

  console.log(`  처리: ${total}건, 업데이트: ${updated}건`);
  offset += BATCH;
}

console.log(`✅ 완료! 총 ${updated}건 detail raw_content 백필 + 재파싱`);
