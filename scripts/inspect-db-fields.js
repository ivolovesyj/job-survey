import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs'

const supabaseUrl = 'https://uphoiwlvglkogkcnrjkl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaG9pd2x2Z2xrb2drY25yamtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzE1MTYsImV4cCI6MjA4NDk0NzUxNn0.gTovFM6q2EEKYWpv3EBlM8t3BjDrg5ieZvSGp3AmLqE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspectFields() {
  console.log('=== 테이블 존재 여부 확인 ===')

  // 테이블 목록 조회 시도
  const { data: tables, error: tableError } = await supabase.rpc('get_tables')

  if (tableError) {
    console.log('테이블 목록 조회 실패 (정상 - RPC 함수 없음)')
  }

  console.log('\n=== DB 연결 테스트 ===')
  const { data: testData, error: testError, count } = await supabase
    .from('jobs')
    .select('id, title, depth_ones, depth_twos, keywords', { count: 'exact' })
    .limit(5)

  if (testError) {
    console.error('DB 연결 실패:', testError)
    return
  }

  console.log(`전체 레코드 수: ${count}개`)
  console.log('샘플 데이터:', JSON.stringify(testData, null, 2))

  console.log('\n=== 직무 대분류 (depth_ones) 샘플 ===')
  const { data: jobs1, error: e1 } = await supabase
    .from('jobs')
    .select('depth_ones')
    .limit(100)

  if (e1) {
    console.error('Error:', e1)
  } else {
    const allDepthOnes = new Set()
    jobs1?.forEach(job => {
      if (Array.isArray(job.depth_ones)) {
        job.depth_ones.forEach(d => allDepthOnes.add(d))
      }
    })
    console.log(Array.from(allDepthOnes).slice(0, 30))
  }

  console.log('\n=== 직무 소분류 (depth_twos) 샘플 ===')
  const { data: jobs2, error: e2 } = await supabase
    .from('jobs')
    .select('depth_twos')
    .limit(100)

  if (e2) {
    console.error('Error:', e2)
  } else {
    const allDepthTwos = new Set()
    jobs2?.forEach(job => {
      if (Array.isArray(job.depth_twos) && job.depth_twos.length > 0) {
        job.depth_twos.forEach(d => allDepthTwos.add(d))
      }
    })
    console.log(Array.from(allDepthTwos).slice(0, 30))
  }

  console.log('\n=== 키워드 (keywords) 샘플 ===')
  const { data: jobs3, error: e3 } = await supabase
    .from('jobs')
    .select('keywords')
    .limit(100)

  if (e3) {
    console.error('Error:', e3)
  } else {
    const allKeywords = new Set()
    jobs3?.forEach(job => {
      if (Array.isArray(job.keywords) && job.keywords.length > 0) {
        job.keywords.forEach(k => allKeywords.add(k))
      }
    })
    console.log(Array.from(allKeywords).slice(0, 50))
  }

  console.log('\n=== RSC vs LD+JSON 비율 ===')
  const { data: allJobs, error: e4 } = await supabase
    .from('jobs')
    .select('depth_twos')

  if (e4) {
    console.error('Error:', e4)
  } else {
    const totalCount = allJobs?.length || 0
    const rscCount = allJobs?.filter(j => Array.isArray(j.depth_twos) && j.depth_twos.length > 0).length || 0

    console.log(`전체: ${totalCount}개`)
    console.log(`RSC (depth_twos 있음): ${rscCount}개`)
    console.log(`LD+JSON (depth_twos 없음): ${totalCount - rscCount}개`)
    console.log(`RSC 비율: ${totalCount > 0 ? ((rscCount / totalCount) * 100).toFixed(1) : 0}%`)
  }
}

inspectFields()
