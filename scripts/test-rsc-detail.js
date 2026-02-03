import axios from 'axios';

const url = 'https://zighang.com/recruitment/b33fb1f8-0786-41a2-9ac5-356ba92005f6';

async function test() {
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Accept: 'text/html' },
    timeout: 10000,
  });

  const html = response.data;

  // RSC flight data에서 JSON 문자열을 모두 추출
  const rscChunks = [];
  const regex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    // 이스케이프 해제
    const decoded = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
    rscChunks.push(decoded);
  }
  const fullRsc = rscChunks.join('');

  // "deadlineType" 키 위치 찾아서 해당 JSON 객체 범위 추출
  const marker = '"deadlineType"';
  const markerIdx = fullRsc.indexOf(marker);
  if (markerIdx === -1) {
    console.log('deadlineType not found');
    return;
  }

  console.log('Found deadlineType at index', markerIdx);

  // 뒤로 가면서 중첩되지 않은 { 찾기 (이스케이프된 따옴표 안의 중괄호는 무시)
  // 간단한 접근: "recruitment":{ 패턴 찾기
  const recruitStart = fullRsc.lastIndexOf('"recruitment":{', markerIdx);
  if (recruitStart === -1) {
    console.log('"recruitment":{ 패턴 못 찾음');
    // 대안: "viewType":"page" 앞의 JSON 블록
    const viewTypeIdx = fullRsc.indexOf('"viewType":"page"', markerIdx);
    console.log('viewType 위치:', viewTypeIdx);
    if (viewTypeIdx !== -1) {
      // viewType 뒤의 } 까지 포함
      const endSnippet = fullRsc.substring(markerIdx - 200, viewTypeIdx + 50);
      console.log('Snippet around data:', endSnippet.substring(0, 500));
    }
    return;
  }

  // "recruitment":{ 다음부터 매칭되는 } 찾기
  const objStart = recruitStart + '"recruitment":'.length;
  let depth = 0;
  let objEnd = objStart;
  for (let i = objStart; i < fullRsc.length; i++) {
    const ch = fullRsc[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        objEnd = i + 1;
        break;
      }
    }
  }

  const jsonStr = fullRsc.substring(objStart, objEnd);
  console.log('JSON length:', jsonStr.length);
  console.log('First 200:', jsonStr.substring(0, 200));
  console.log('Last 200:', jsonStr.substring(jsonStr.length - 200));

  try {
    const data = JSON.parse(jsonStr);
    console.log('\n=== Parsed recruitment data ===');
    // 핵심 필드만 출력
    const fields = ['id', 'title', 'deadlineType', 'endDate', 'careerMin', 'careerMax',
      'regions', 'employeeTypes', 'depthOnes', 'depthTwos', 'keywords', 'views', 'status'];
    for (const f of fields) {
      console.log(`  ${f}:`, JSON.stringify(data[f]));
    }
    // company
    console.log('  company:', JSON.stringify(data.company));
    // detail 관련
    console.log('  intro:', data.intro?.substring(0, 100));
    console.log('  mainTasks:', data.mainTasks?.substring(0, 100));
    console.log('  requirements:', data.requirements?.substring(0, 100));
    console.log('  preferredPoints:', data.preferredPoints?.substring(0, 100));
    console.log('  benefits:', data.benefits?.substring(0, 100));
    console.log('\n  ALL KEYS:', Object.keys(data));
  } catch (e) {
    console.log('Parse failed:', e.message);
    console.log('Trying to find issue...');
    // 500자씩 잘라서 파싱 시도
    for (let i = 0; i < jsonStr.length; i += 500) {
      try {
        JSON.parse(jsonStr.substring(0, i + 500) + '}');
      } catch {
        // 실패하는 지점 표시
      }
    }
  }
}

test().catch(console.error);
