import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://zighang.com';

/**
 * 학력 정보 정규화 (다양한 표현을 표준 형식으로 변환)
 */
function normalizeEducation(education) {
  if (!education) return null;
  const normalized = education.trim();
  
  // 매핑 테이블
  const eduMap = {
    '무관': ['무관', '학력무관', '학력 무관', '제한없음'],
    '고졸': ['고졸', '고등학교', '고등학교 졸업'],
    '전문대졸': ['전문대졸', '전문대', '전문학사'],
    '학사': ['학사', '대졸', '대학 졸업', '대학교 졸업', '4년제'],
    '석사': ['석사', '석사 학위'],
    '박사': ['박사', '박사 학위'],
  };
  
  for (const [standard, variations] of Object.entries(eduMap)) {
    if (variations.some(v => normalized.includes(v))) {
      return standard;
    }
  }
  
  return normalized; // 매핑되지 않으면 원본 반환
}

/**
 * 학력 정보 추출 헬퍼 함수
 */
function extractEducation(recruitment) {
  // 1순위: RSC에 educations 배열이 있으면 직접 사용
  if (recruitment.educations && Array.isArray(recruitment.educations) && recruitment.educations.length > 0) {
    return normalizeEducation(recruitment.educations[0]);
  }
  
  // 2순위: RSC에 education 단수형 필드가 있으면 사용
  if (recruitment.education && typeof recruitment.education === 'string') {
    return normalizeEducation(recruitment.education);
  }

  return null;
}

/**
 * 회사 상세 페이지에서 회사 유형 추출
 */
async function fetchCompanyDetail(companyId) {
  try {
    const companyUrl = `${BASE_URL}/company/${companyId}`;
    const response = await axios.get(companyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 10000,
    });

    const html = response.data;

    // RSC에서 metadata 추출
    const rscChunks = [];
    const regex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
      const decoded = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      rscChunks.push(decoded);
    }
    
    const fullRsc = rscChunks.join('');

    // 회사 유형 추출 (meta keywords에서)
    let company_type = '중소기업'; // 기본값
    const keywordsMatch = fullRsc.match(/\["\$","meta","3",\{"name":"keywords","content":"([^"]+)"\}\]/);
    if (keywordsMatch) {
      const keywords = keywordsMatch[1].split(',').map(k => k.trim());
      // 뒤에서 두 번째 항목이 회사 유형
      if (keywords.length >= 2) {
        const potentialType = keywords[keywords.length - 2];
        // 유효한 회사 유형인지 확인
        const validTypes = ['대기업', '중견기업', '중소기업', '스타트업', '유니콘', '외국계', '공기업'];
        if (validTypes.includes(potentialType)) {
          company_type = potentialType;
        }
      }
    }

    return { company_type };
  } catch (error) {
    console.error(`회사 상세 정보 크롤링 실패 (${companyId}):`, error.message);
    return { company_type: '중소기업' };
  }
}

/**
 * 공고 상세 정보 가져오기
 */
async function getJobDetail(jobId, recruitment) {
  try {
    const response = await axios.get(`${BASE_URL}/recruitment/${jobId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 5000,
    });

    const $ = cheerio.load(response.data);
    const nextDataScript = $('#__NEXT_DATA__').html();
    
    if (nextDataScript) {
      const nextData = JSON.parse(nextDataScript);
      const recruitmentData = nextData?.props?.pageProps?.recruitment;
      
      if (recruitmentData) {
        // 학력 정보 추출
        const education = extractEducation(recruitmentData);
        
        // 회사 유형 추출
        let company_type = '중소기업';
        const companyId = recruitmentData.company?.id;
        const hasDetailInfo = recruitmentData.company?.hasDetailInfo;
        
        if (companyId && hasDetailInfo === true) {
          const companyDetail = await fetchCompanyDetail(companyId);
          company_type = companyDetail.company_type;
        }
        
        return {
          intro: recruitmentData.intro || '',
          main_tasks: recruitmentData.mainTasks || '',
          requirements: recruitmentData.requirements || '',
          preferred_points: recruitmentData.preferredPoints || '',
          benefits: recruitmentData.benefits || '',
          work_conditions: recruitmentData.workConditions || '',
          deadline: recruitmentData.deadline || recruitmentData.endDate || recruitmentData.dueDate || null,
          education,
          company_type,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`  상세 정보 오류 (${jobId}):`, error.message);
    return null;
  }
}

export async function crawlZighang() {
  const jobs = [];
  
  try {
    const searchTerms = ['마케팅', '브랜드'];
    
    for (const term of searchTerms) {
      const encodedTerm = encodeURIComponent(term);
      const url = `${BASE_URL}/search?q=${encodedTerm}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        timeout: 10000,
      });
      
      const $ = cheerio.load(response.data);
      const nextDataScript = $('#__NEXT_DATA__').html();
      
      if (nextDataScript) {
        try {
          const nextData = JSON.parse(nextDataScript);
          const recruitments = nextData?.props?.pageProps?.recruitments || [];
          
          for (const job of recruitments.slice(0, 10)) {
            const career = job.career || '';
            if (career.includes('신입') || career.includes('무관') || !career) {
              console.log(`  - ${job.company?.name}: ${job.title}`);
              
              const jobData = {
                source: 'zighang',
                title: job.title || '',
                company: job.company?.name || '',
                link: `${BASE_URL}/recruitment/${job.id}`,
                jobId: job.id,
                career: career || '경력무관',
                location: job.location || '',
                deadline: null,
                education: null,
                company_type: '중소기업',
                crawledAt: new Date().toISOString(),
              };

              const detail = await getJobDetail(job.id, job);
              if (detail) {
                if (detail.deadline) {
                  jobData.deadline = detail.deadline;
                }
                if (detail.education) {
                  jobData.education = detail.education;
                }
                if (detail.company_type) {
                  jobData.company_type = detail.company_type;
                }
                jobData.detail = detail;
              }

              jobs.push(jobData);
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } catch (parseError) {
          console.error('직항 데이터 파싱 오류:', parseError.message);
        }
      }
    }
    
  } catch (error) {
    console.error('직항 크롤링 오류:', error.message);
  }
  
  const uniqueJobs = jobs.filter((job, index, self) =>
    index === self.findIndex(j => j.link === job.link)
  );
  
  return uniqueJobs;
}
