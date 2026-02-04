-- ============================================================
-- jobs 테이블에 company_type 컬럼 추가 및 데이터 채우기
-- companies 테이블과 JOIN하여 기업 유형 정보 통합
-- ============================================================

-- 1. jobs 테이블에 company_type 컬럼 추가
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS company_type TEXT;

-- 2. normalized_name 매칭을 통해 company_type 채우기
UPDATE public.jobs j
SET company_type = c.company_type
FROM public.companies c
WHERE 
  -- normalized_name으로 매칭
  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(
    j.company, 
    '\(주\)', '', 'g'),
    '\(유\)', '', 'g'),
    '㈜', '', 'g'),
    '주식회사', '', 'g'),
    '\s+', '', 'g')
  ) = c.normalized_name
  AND c.company_type IS NOT NULL;

-- 3. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_jobs_company_type ON public.jobs(company_type);

-- 4. 결과 확인
DO $$
DECLARE
  total_jobs INTEGER;
  matched_jobs INTEGER;
  match_rate NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_jobs FROM public.jobs WHERE is_active = true;
  SELECT COUNT(*) INTO matched_jobs FROM public.jobs WHERE is_active = true AND company_type IS NOT NULL;
  
  IF total_jobs > 0 THEN
    match_rate := (matched_jobs::NUMERIC / total_jobs::NUMERIC * 100);
    RAISE NOTICE '전체 활성 공고: %개', total_jobs;
    RAISE NOTICE '기업 유형 매칭 완료: %개 (%.1f%%)', matched_jobs, match_rate;
  ELSE
    RAISE NOTICE '활성 공고가 없습니다.';
  END IF;
END $$;

-- 5. 기업 유형별 분포 확인
SELECT 
  company_type,
  COUNT(*) as count
FROM public.jobs
WHERE is_active = true AND company_type IS NOT NULL
GROUP BY company_type
ORDER BY count DESC;
