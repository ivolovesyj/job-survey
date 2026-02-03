import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs'
import { crawlAll } from '../src/crawlers/zighang-full.js'

const supabaseUrl = 'https://uphoiwlvglkogkcnrjkl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaG9pd2x2Z2xrb2drY25yamtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzE1MTYsImV4cCI6MjA4NDk0NzUxNn0.gTovFM6q2EEKYWpv3EBlM8t3BjDrg5ieZvSGp3AmLqE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testCrawl() {
  console.log('=== 샘플 크롤링 시작 (최대 10건) ===')

  let count = 0
  const maxJobs = 10

  await crawlAll({
    onBatch: async (jobs) => {
      if (count >= maxJobs) return

      const jobsToInsert = jobs.slice(0, maxJobs - count)
      count += jobsToInsert.length

      console.log(`\n저장: ${jobsToInsert.length}건`)

      const { error } = await supabase
        .from('jobs')
        .upsert(jobsToInsert, {
          onConflict: 'id',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('저장 실패:', error)
      } else {
        console.log(`✅ DB 저장 완료 (누적: ${count}건)`)
      }

      if (count >= maxJobs) {
        console.log(`\n🎯 목표 ${maxJobs}건 달성, 크롤링 중단`)
        process.exit(0)
      }
    },
    onProgress: ({ current, total, success, failed }) => {
      if (count >= maxJobs) {
        process.exit(0)
      }
    }
  })

  console.log('\n=== 크롤링 완료 ===')
}

testCrawl().catch(console.error)
