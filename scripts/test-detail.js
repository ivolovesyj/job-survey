import { fetchSitemapIndex, fetchSitemapUrls, fetchJobDetail } from '../src/crawlers/zighang-full.js';

async function test() {
  const sitemaps = await fetchSitemapIndex();
  const entries = await fetchSitemapUrls(sitemaps[0]);

  console.log(`\n테스트: 3건 상세 페이지 크롤링\n`);

  for (let i = 0; i < 3; i++) {
    const job = await fetchJobDetail(entries[i]);
    if (job) {
      console.log(`${i+1}. ${job.company} - ${job.title}`);
      console.log(`   위치: ${job.location}, 직군: ${job.depth_ones}, 고용: ${job.employee_types}`);
      console.log(`   등록일: ${job.original_created_at}`);
      console.log(`   설명: ${job.detail?.main_tasks?.substring(0, 100)}...`);
      console.log();
    } else {
      console.log(`${i+1}. ${entries[i].id} → null (파싱 실패)`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

test().catch(console.error);
