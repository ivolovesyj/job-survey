-- ============================================================
-- get_filtered_jobs 함수 최종 수정 - jsonb 타입 올바르게 처리
-- 스키마 확인 결과: depth_ones, depth_twos, keywords, regions, employee_types 모두 jsonb 타입
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 기존 함수 삭제
DROP FUNCTION IF EXISTS get_filtered_jobs(text[], text[], integer);

-- 새 함수 생성 (jsonb를 text[]로 변환하여 반환)
CREATE OR REPLACE FUNCTION get_filtered_jobs(
  p_job_types text[] DEFAULT NULL,
  p_locations text[] DEFAULT NULL,
  p_limit integer DEFAULT 2000
)
RETURNS TABLE(
  id text,
  source text,
  company text,
  company_image text,
  company_type text,
  title text,
  regions text[],
  location text,
  career_min integer,
  career_max integer,
  employee_types text[],
  deadline_type text,
  end_date text,
  depth_ones text[],
  depth_twos text[],
  keywords text[],
  views integer,
  detail jsonb,
  original_created_at text,
  last_modified_at text,
  crawled_at text,
  is_active boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.id,
    j.source,
    j.company,
    j.company_image,
    j.company_type,
    j.title,
    -- jsonb를 text[] 배열로 변환
    COALESCE(
      CASE
        WHEN jsonb_typeof(j.regions) = 'array' THEN
          ARRAY(SELECT jsonb_array_elements_text(j.regions))
        ELSE ARRAY[]::text[]
      END,
      ARRAY[]::text[]
    ) as regions,
    j.location,
    j.career_min,
    j.career_max,
    COALESCE(
      CASE
        WHEN jsonb_typeof(j.employee_types) = 'array' THEN
          ARRAY(SELECT jsonb_array_elements_text(j.employee_types))
        ELSE ARRAY[]::text[]
      END,
      ARRAY[]::text[]
    ) as employee_types,
    j.deadline_type,
    j.end_date::text,
    COALESCE(
      CASE
        WHEN jsonb_typeof(j.depth_ones) = 'array' THEN
          ARRAY(SELECT jsonb_array_elements_text(j.depth_ones))
        ELSE ARRAY[]::text[]
      END,
      ARRAY[]::text[]
    ) as depth_ones,
    COALESCE(
      CASE
        WHEN jsonb_typeof(j.depth_twos) = 'array' THEN
          ARRAY(SELECT jsonb_array_elements_text(j.depth_twos))
        ELSE ARRAY[]::text[]
      END,
      ARRAY[]::text[]
    ) as depth_twos,
    COALESCE(
      CASE
        WHEN jsonb_typeof(j.keywords) = 'array' THEN
          ARRAY(SELECT jsonb_array_elements_text(j.keywords))
        ELSE ARRAY[]::text[]
      END,
      ARRAY[]::text[]
    ) as keywords,
    j.views,
    j.detail,
    j.original_created_at::text,
    j.last_modified_at::text,
    j.crawled_at::text,
    j.is_active
  FROM jobs j
  WHERE j.is_active = true
    -- 직무 필터링 (depth_twos 또는 depth_ones에 매칭)
    AND (
      p_job_types IS NULL
      OR array_length(p_job_types, 1) IS NULL
      OR (
        jsonb_typeof(j.depth_twos) = 'array'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(j.depth_twos) AS dt
          WHERE dt = ANY(p_job_types)
        )
      )
      OR (
        jsonb_typeof(j.depth_ones) = 'array'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(j.depth_ones) AS d1
          WHERE d1 = ANY(p_job_types)
        )
      )
    )
    -- 지역 필터링 (ILIKE로 부분 매칭)
    AND (
      p_locations IS NULL
      OR array_length(p_locations, 1) IS NULL
      OR (
        jsonb_typeof(j.regions) = 'array'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(j.regions) AS r
          WHERE EXISTS (
            SELECT 1
            FROM unnest(p_locations) AS loc
            WHERE r ILIKE '%' || loc || '%'
          )
        )
      )
    )
  ORDER BY j.crawled_at DESC
  LIMIT COALESCE(p_limit, 2000);
END;
$$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION get_filtered_jobs(text[], text[], integer) TO anon, authenticated;

-- 테스트 쿼리
SELECT
  COUNT(*) as total_jobs,
  '함수가 성공적으로 생성되었습니다.' as message
FROM get_filtered_jobs(NULL, NULL, 10);

-- 필터 테스트 (예시)
-- SELECT * FROM get_filtered_jobs(ARRAY['프론트엔드', '백엔드'], ARRAY['서울', '경기'], 50);
