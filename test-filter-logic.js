// 실제 DB 데이터 기반 필터 로직 테스트
console.log('=== 필터 매칭 로직 테스트 ===\n');

// DB 실제 값들
const dbEmployeeTypes = [
  'CONTRACTOR', 'TEMPORARY', '계약직', '계약직/일용직', '병역특례',
  '인턴', '일용직', '전환형인턴', '정규직', '체험형인턴', '프리랜서'
];

// 정규화 함수 (API 코드와 동일)
const normalizeEmployeeType = (type) => {
  const upper = type.toUpperCase();
  if (upper === 'CONTRACTOR') return '프리랜서';
  if (upper === 'TEMPORARY') return '계약직';
  return type;
};

// 테스트 케이스
const testCases = [
  { filter: '인턴', expected: ['인턴', '전환형인턴', '체험형인턴'] },
  { filter: '프리랜서', expected: ['프리랜서', 'CONTRACTOR'] },
  { filter: '계약직', expected: ['계약직', 'TEMPORARY', '계약직/일용직'] },
  { filter: '정규직', expected: ['정규직'] },
  { filter: '일용직', expected: ['일용직', '계약직/일용직'] },
  { filter: '병역특례', expected: ['병역특례'] },
];

testCases.forEach(({ filter, expected }) => {
  console.log(`[테스트] 사용자 필터: "${filter}"`);
  console.log('예상 매칭: ' + expected.join(', '));
  console.log('실제 매칭:');

  const matched = [];
  const notMatched = [];

  dbEmployeeTypes.forEach(dbType => {
    const normalized = normalizeEmployeeType(dbType);
    const isMatch = normalized.includes(filter) || filter.includes(normalized);

    if (isMatch) {
      matched.push(dbType);
      console.log(`  ✅ ${dbType} → ${normalized}`);
    } else {
      notMatched.push(dbType);
    }
  });

  // 검증
  const matchedSet = new Set(matched);
  const expectedSet = new Set(expected);
  const allExpectedMatched = expected.every(e => matchedSet.has(e));
  const noUnexpectedMatches = matched.every(m => expectedSet.has(m));

  if (allExpectedMatched && noUnexpectedMatches) {
    console.log('✅ 테스트 통과\n');
  } else {
    console.log('❌ 테스트 실패');
    console.log('누락된 매칭:', expected.filter(e => !matchedSet.has(e)));
    console.log('잘못된 매칭:', matched.filter(m => !expectedSet.has(m)));
    console.log('');
  }
});

console.log('=== 전체 결과 ===');
console.log('모든 고용형태 값 정규화 후:');
dbEmployeeTypes.forEach(type => {
  console.log(`  ${type} → ${normalizeEmployeeType(type)}`);
});
