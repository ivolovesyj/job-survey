/**
 * 기존 jobs 테이블의 detail 필드를 섹션별로 재파싱하는 후처리 스크립트.
 * 크롤링 완료 후 1회 실행.
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
  main_tasks: /^(담당업무|주요업무|업무\s*내용|직무\s*내용|하는\s*일|업무\s*소개|업무\s*설명)/,
  requirements: /^(자격요건|자격\s*조건|지원\s*자격|필수\s*요건|필수\s*조건|응모\s*자격|채용\s*조건)/,
  preferred_points: /^(우대사항|우대\s*조건|우대\s*요건|이런\s*분.*우대|이런\s*분.*환영)/,
  benefits: /^(복리후생|혜택|복지|근무\s*혜택|직원\s*혜택|사내\s*복지)/,
  work_conditions: /^(근무환경|근무\s*조건|근무\s*시간|근무\s*형태|급여|연봉|근무환경\/급여|처우\s*조건)/,
};

function parseDetailSections(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const result = { intro: '', main_tasks: '', requirements: '', preferred_points: '', benefits: '', work_conditions: '' };
  let currentSection = 'intro';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { result[currentSection] += '\n'; continue; }

    let matched = false;
    for (const [key, regex] of Object.entries(sectionMap)) {
      if (regex.test(trimmed)) { currentSection = key; matched = true; break; }
    }
    if (!matched && /^(제출서류|전형절차|접수방법|마감기한|채용\s*절차|지원\s*방법|서류\s*접수)/.test(trimmed)) {
      currentSection = 'work_conditions'; matched = true;
    }
    if (!matched) result[currentSection] += trimmed + '\n';
  }

  for (const key of Object.keys(result)) {
    result[key] = result[key].replace(/\n{3,}/g, '\n\n').trim();
  }
  return result;
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

console.log('⏳ detail 섹션 분리 시작...');

while (true) {
  const jobs = await supabaseRpc('GET',
    `jobs?select=id,detail&order=id&limit=${BATCH}&offset=${offset}`
  );
  if (!jobs.length) break;

  const patches = [];
  for (const job of jobs) {
    const text = job.detail?.main_tasks;
    // main_tasks에 모든 내용이 뭉쳐있고 requirements가 비어있으면 재파싱 대상
    if (text && text.length > 50 && !job.detail?.requirements) {
      const parsed = parseDetailSections(text);
      if (parsed && parsed.requirements) {
        patches.push({ id: job.id, detail: parsed });
      }
    }
  }

  // 개별 PATCH (Supabase REST는 bulk update 미지원)
  for (const p of patches) {
    await supabaseRpc('PATCH', `jobs?id=eq.${p.id}`, { detail: p.detail });
    updated++;
  }

  console.log(`  처리: ${offset + jobs.length}건, 업데이트: ${updated}건`);
  offset += BATCH;
}

console.log(`✅ 완료! 총 ${updated}건 detail 섹션 분리`);
