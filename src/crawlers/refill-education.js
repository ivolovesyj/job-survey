/**
 * Education이 null인 공고들만 다시 크롤링하는 1회용 스크립트
 *
 * 실행 방법:
 * node src/crawlers/refill-education.js
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';

const BASE_URL = 'https://zighang.com';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html',
};

const CONCURRENCY = 5; // 동시 요청 수
const BATCH_SIZE = 50; // Supabase upsert 배치 크기

// Supabase 클라이언트
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uphoiwlvglkogkcnrjkl.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaG9pd2x2Z2xrb2drY25yamtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzE1MTYsImV4cCI6MjA4NDk0NzUxNn0.gTovFM6q2EEKYWpv3EBlM8t3BjDrg5ieZvSGp3AmLqE';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * DB에서 education이 null인 공고 목록 가져오기
 */
async function fetchJobsWithoutEducation() {
  console.log('📋 education이 null인 공고 조회 중...\n');

  let allJobs = [];
  let offset = 0;
  const limit = 500; // 타임아웃 방지를 위해 500으로 축소

  // 최대 30,000개만 조회 (타임아웃 방지)
  const maxJobs = 30000;

  while (allJobs.length < maxJobs) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, company')
        .is('education', null)
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Supabase 조회 실패:', error.message);
        // 타임아웃이면 여기서 멈추고 지금까지 조회한 것으로 진행
        if (error.code === '57014') {
          console.log('⚠️  타임아웃 발생 - 지금까지 조회한 공고로 진행합니다.\n');
          break;
        }
        throw error;
      }

      if (!data || data.length === 0) break;

      allJobs.push(...data);
      offset += limit;

      console.log(`  ✓ ${allJobs.length}개 조회됨...`);
    } catch (err) {
      console.error('❌ 조회 중 오류:', err.message);
      break;
    }
  }

  console.log(`\n✅ 총 ${allJobs.length}개 공고 발견\n`);
  return allJobs;
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
    const blockTypes = ['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem', 'blockquote'];
    if (blockTypes.includes(node.type)) {
      return parts.join('') + '\n';
    }
    return parts.join('');
  }
  return walk(doc).replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * 학력 정보 정규화
 */
function normalizeEducation(education) {
  const normalized = education.trim();

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

  return normalized;
}

/**
 * 학력 정보 추출
 */
function extractEducation(recruitment, requirementsText) {
  // 1순위: educations 배열
  if (recruitment.educations && Array.isArray(recruitment.educations) && recruitment.educations.length > 0) {
    return normalizeEducation(recruitment.educations[0]);
  }

  // 2순위: education 단수형
  if (recruitment.education && typeof recruitment.education === 'string') {
    return normalizeEducation(recruitment.education);
  }

  // 3순위: requirements 텍스트에서 키워드 검색
  if (requirementsText) {
    const text = requirementsText.toLowerCase();

    if (text.includes('학력무관') || text.includes('학력 무관')) return '무관';
    if (text.includes('박사')) return '박사';
    if (text.includes('석사')) return '석사';
    if (text.includes('학사') || text.includes('대졸') || text.includes('대학교 졸업')) return '학사';
    if (text.includes('전문대') || text.includes('전문학사')) return '전문대졸';
    if (text.includes('고졸') || text.includes('고등학교')) return '고졸';
  }

  return null;
}

/**
 * RSC에서 recruitment 객체 추출
 */
function extractRecruitmentFromRsc(html) {
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
  const recruitStart = fullRsc.indexOf('"recruitment":{');
  if (recruitStart === -1) return null;

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
    const jsonStr = fullRsc.slice(objStart, objEnd);
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

/**
 * 개별 공고 상세 크롤링
 */
async function fetchJobDetail(jobId) {
  try {
    const url = `${BASE_URL}/recruitment/${jobId}`;
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000,
    });

    const recruitment = extractRecruitmentFromRsc(response.data);
    if (!recruitment) {
      return { id: jobId, education: null };
    }

    // description에서 평문 추출
    const descText = prosemirrorToText(recruitment.description);

    // detail 섹션 분리
    const sections = descText.split('\n');
    const requirementsText = sections.join('\n');

    // 학력 추출
    const education = extractEducation(recruitment, requirementsText);

    return {
      id: jobId,
      education,
    };
  } catch (error) {
    console.error(`  ✗ ${jobId}: ${error.message}`);
    return { id: jobId, education: null };
  }
}

/**
 * 메인 실행 함수
 */
async function main() {
  console.log('🚀 Education 재크롤링 시작\n');
  console.log('=' .repeat(60));

  // 1. education이 null인 공고 조회
  const jobs = await fetchJobsWithoutEducation();

  if (jobs.length === 0) {
    console.log('✅ 모든 공고에 education 데이터가 있습니다!');
    return;
  }

  // 2. 동시성 제한으로 크롤링
  console.log(`📡 크롤링 시작 (동시 요청 수: ${CONCURRENCY})\n`);

  const limit = pLimit(CONCURRENCY);
  let completed = 0;
  let updated = 0;
  const results = [];

  const tasks = jobs.map((job) =>
    limit(async () => {
      const result = await fetchJobDetail(job.id);
      completed++;

      if (result.education) {
        updated++;
        results.push(result);
      }

      if (completed % 100 === 0) {
        console.log(`  진행: ${completed}/${jobs.length} (education 발견: ${updated}개)`);
      }

      return result;
    })
  );

  await Promise.all(tasks);

  console.log(`\n✅ 크롤링 완료: ${completed}/${jobs.length}`);
  console.log(`   - education 발견: ${updated}개`);
  console.log(`   - education 없음: ${completed - updated}개\n`);

  // 3. Supabase 업데이트 (배치 처리)
  if (results.length === 0) {
    console.log('⚠️  업데이트할 데이터가 없습니다.');
    return;
  }

  console.log(`💾 Supabase 업데이트 중... (배치 크기: ${BATCH_SIZE})\n`);

  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('jobs')
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`  ✗ 배치 ${Math.floor(i / BATCH_SIZE) + 1} 실패:`, error.message);
    } else {
      console.log(`  ✓ 배치 ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length}개 업데이트`);
    }
  }

  console.log(`\n✅ 완료! ${results.length}개 공고의 education 업데이트됨`);
  console.log('=' .repeat(60));
}

// 실행
main().catch(console.error);
