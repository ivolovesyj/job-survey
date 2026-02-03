-- 비로그인 사용자(anon)도 활성 공고를 조회할 수 있도록 정책 추가
CREATE POLICY "Anonymous users can view active jobs"
ON public.jobs
FOR SELECT
TO anon
USING (is_active = true);
