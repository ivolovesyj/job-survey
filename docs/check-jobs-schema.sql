-- jobs 테이블의 정확한 스키마 확인
SELECT
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'jobs'
    AND column_name IN ('depth_ones', 'depth_twos', 'keywords', 'regions', 'employee_types')
ORDER BY ordinal_position;
