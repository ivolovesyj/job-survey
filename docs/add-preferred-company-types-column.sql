-- ============================================================
-- user_preferences 테이블에 preferred_company_types 컬럼 추가
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- preferred_company_types 컬럼 추가
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS preferred_company_types JSONB;

-- 기본값 설정 (기존 행들에 대해)
UPDATE public.user_preferences 
SET preferred_company_types = '[]'::jsonb 
WHERE preferred_company_types IS NULL;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'preferred_company_types 컬럼이 성공적으로 추가되었습니다.';
END $$;
