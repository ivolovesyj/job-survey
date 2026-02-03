import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uphoiwlvglkogkcnrjkl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaG9pd2x2Z2xrb2drY25yamtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzE1MTYsImV4cCI6MjA4NDk0NzUxNn0.gTovFM6q2EEKYWpv3EBlM8t3BjDrg5ieZvSGp3AmLqE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkJobs() {
  console.log('=== 공고 데이터 확인 ===\n')

  // 전체 공고 수 확인
  const { count: totalCount, error: e1 } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })

  if (e1) {
    console.log('❌ 공고 조회 실패:', e1.message)
    return
  }

  console.log(`총 공고 수: ${totalCount}`)

  // 활성 공고 수 확인
  const { count: activeCount, error: e2 } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  if (e2) {
    console.log('❌ 활성 공고 조회 실패:', e2.message)
    return
  }

  console.log(`활성 공고 수: ${activeCount}`)

  // 최근 공고 5개 확인
  if (activeCount > 0) {
    const { data: recentJobs, error: e3 } = await supabase
      .from('jobs')
      .select('id, company, title, crawled_at, is_active')
      .eq('is_active', true)
      .order('crawled_at', { ascending: false })
      .limit(5)

    if (e3) {
      console.log('❌ 최근 공고 조회 실패:', e3.message)
    } else {
      console.log('\n최근 공고 5개:')
      recentJobs.forEach((job, idx) => {
        console.log(`${idx + 1}. ${job.company} - ${job.title}`)
        console.log(`   ID: ${job.id}`)
        console.log(`   크롤링: ${job.crawled_at}\n`)
      })
    }
  } else {
    console.log('\n⚠️  활성 공고가 없습니다!')
    console.log('크롤러를 실행해서 공고 데이터를 수집해야 합니다.')
    console.log('\n실행 방법:')
    console.log('1. npm run crawler:full    (전체 크롤링)')
    console.log('2. npm run crawler:recent  (최근 공고만)')
  }
}

checkJobs().catch(console.error)
