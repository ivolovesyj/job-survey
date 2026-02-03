-- jobs 테이블: 비로그인 사용자도 is_active=true인 공고 조회 가능
CREATE POLICY "Anyone can view active jobs"
ON jobs FOR SELECT
TO anon
USING (is_active = true);

-- 혹시 기존 정책이 있다면 삭제 후 다시 생성
-- DROP POLICY IF EXISTS "Anyone can view active jobs" ON jobs;
