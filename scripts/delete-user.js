import { createClient } from '../web/node_modules/@supabase/supabase-js/dist/index.mjs'

const supabaseUrl = 'https://uphoiwlvglkogkcnrjkl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwaG9pd2x2Z2xrb2drY25yamtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNzE1MTYsImV4cCI6MjA4NDk0NzUxNn0.gTovFM6q2EEKYWpv3EBlM8t3BjDrg5ieZvSGp3AmLqE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function deleteUser() {
  console.log('=== 사용자 정보 조회 ===\n')

  // user_profiles 테이블에서 사용자 정보 확인
  const { data: profiles, error: e0 } = await supabase
    .from('user_profiles')
    .select('id, email, name')
    .limit(10)

  if (e0) {
    console.log('user_profiles 조회 실패:', e0.message)
  }

  // saved_jobs 테이블에서 사용자 ID 확인
  const { data: savedJobs, error: e1 } = await supabase
    .from('saved_jobs')
    .select('user_id')
    .limit(10)

  if (e1) {
    console.log('saved_jobs 조회 실패:', e1.message)
  }

  // 사용자 목록 생성
  const users = new Map()

  if (profiles && profiles.length > 0) {
    profiles.forEach(profile => {
      users.set(profile.id, profile.email || '(이메일 없음)')
    })
  }

  if (savedJobs && savedJobs.length > 0) {
    savedJobs.forEach(job => {
      if (!users.has(job.user_id)) {
        users.set(job.user_id, '(프로필 없음)')
      }
    })
  }

  if (users.size > 0) {
    console.log('등록된 사용자:')
    users.forEach((email, id) => {
      console.log(`  ID: ${id}`)
      console.log(`  Email: ${email}\n`)
    })

    // 모든 사용자 데이터 삭제
    for (const [userId, email] of users) {
      console.log(`${email} 데이터 삭제 중...`)

      // user_job_actions 삭제
      const { error: e2 } = await supabase
        .from('user_job_actions')
        .delete()
        .eq('user_id', userId)

      if (e2) {
        console.log(`  ✗ user_job_actions 삭제 실패: ${e2.message}`)
      } else {
        console.log(`  ✓ user_job_actions 삭제 완료`)
      }

      // keyword_weights 삭제
      const { error: e3 } = await supabase
        .from('keyword_weights')
        .delete()
        .eq('user_id', userId)

      if (e3) {
        console.log(`  ✗ keyword_weights 삭제 실패: ${e3.message}`)
      } else {
        console.log(`  ✓ keyword_weights 삭제 완료`)
      }

      // company_preference 삭제
      const { error: e4 } = await supabase
        .from('company_preference')
        .delete()
        .eq('user_id', userId)

      if (e4) {
        console.log(`  ✗ company_preference 삭제 실패: ${e4.message}`)
      } else {
        console.log(`  ✓ company_preference 삭제 완료`)
      }

      // saved_jobs 삭제
      const { error: e5 } = await supabase
        .from('saved_jobs')
        .delete()
        .eq('user_id', userId)

      if (e5) {
        console.log(`  ✗ saved_jobs 삭제 실패: ${e5.message}`)
      } else {
        console.log(`  ✓ saved_jobs 삭제 완료`)
      }

      // sent_jobs 삭제
      const { error: e6 } = await supabase
        .from('sent_jobs')
        .delete()
        .eq('user_id', userId)

      if (e6) {
        console.log(`  ✗ sent_jobs 삭제 실패: ${e6.message}`)
      } else {
        console.log(`  ✓ sent_jobs 삭제 완료`)
      }

      // user_preferences 삭제
      const { error: e7 } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', userId)

      if (e7) {
        console.log(`  ✗ user_preferences 삭제 실패: ${e7.message}`)
      } else {
        console.log(`  ✓ user_preferences 삭제 완료`)
      }

      // user_profiles 삭제
      const { error: e8 } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId)

      if (e8) {
        console.log(`  ✗ user_profiles 삭제 실패: ${e8.message}`)
      } else {
        console.log(`  ✓ user_profiles 삭제 완료`)
      }

      console.log()
    }

    console.log('✅ 모든 사용자 데이터 삭제 완료')
    console.log('\n⚠️  참고: Supabase Auth 계정은 대시보드에서 직접 삭제해야 합니다.')
    console.log('   경로: Authentication > Users > 해당 사용자 선택 > Delete User')
    console.log('   또는 아래 사용자 ID로 직접 삭제:')
    users.forEach((email, id) => {
      console.log(`   - ${email}: ${id}`)
    })
  } else {
    console.log('저장된 사용자 데이터가 없습니다.')
  }
}

deleteUser().catch(console.error)
