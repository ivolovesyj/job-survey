-- ============================================================
-- 매칭 안 된 공고들의 company_type을 '기타'로 설정
-- ============================================================

-- company_type이 NULL인 공고들을 '기타'로 업데이트
UPDATE public.jobs
SET company_type = '기타'
WHERE company_type IS NULL;

-- 결과 확인
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count 
  FROM public.jobs 
  WHERE company_type = '기타' AND is_active = true;
  
  RAISE NOTICE '''기타''로 설정된 활성 공고: %개', updated_count;
END $$;

-- 전체 기업 유형별 분포 재확인
SELECT 
  COALESCE(company_type, '(NULL)') as company_type,
  COUNT(*) as count
FROM public.jobs
WHERE is_active = true
GROUP BY company_type
ORDER BY count DESC;
