# 지원함 (JiwonBox)

모든 지원 내역을 한곳에서 체계적으로 관리하고, AI가 분석한 맞춤형 채용공고를 매일 받아보세요.

## 수집 사이트
- 잡코리아
- 원티드  
- 직항

## 설정 방법

### 1. 카카오톡 채널 웹훅 설정

1. [카카오 비즈니스](https://business.kakao.com) 접속
2. 카카오톡 채널 생성 (없는 경우)
3. 채널 관리 → 비즈니스 도구 → 카카오톡 채널 → 웹훅 설정
4. 웹훅 URL 복사

### 2. GitHub 저장소 설정

1. 이 폴더를 GitHub에 push
2. 저장소 Settings → Secrets and variables → Actions
3. `New repository secret` 클릭
4. Name: `KAKAO_WEBHOOK_URL`
5. Value: 복사한 웹훅 URL 붙여넣기

### 3. 실행 확인

- Actions 탭에서 `Daily Job Alert` 워크플로우 확인
- 수동 실행: `Run workflow` 버튼 클릭
- 자동 실행: 매일 오전 8시 (한국시간)

## 로컬 테스트

```bash
npm install
cp .env.example .env
# .env 파일에 KAKAO_WEBHOOK_URL 입력
npm start
```

## 파일 구조

```
📦 채용공고/
├── 📁 src/                      # 소스 코드
│   ├── 📁 crawlers/             # 크롤러 모듈
│   │   ├── wanted.js           # 원티드 크롤러
│   │   ├── zighang.js          # 직항 크롤러
│   │   └── jobkorea.js         # 잡코리아 크롤러
│   ├── 📁 filters/              # 필터링 로직
│   │   ├── job-filter.js       # 맞춤형 필터링 (설문 기반)
│   │   ├── job-dedup.js        # 중복 제거
│   │   └── job-learner.js      # 피드백 학습
│   ├── 📁 utils/                # 유틸리티
│   ├── index.js                # 메인 실행 파일
│   └── kakao.js                # 카카오톡 알림
├── 📁 scripts/                  # 테스트/개발 스크립트
│   ├── test-filter.js          # 필터 테스트
│   └── test-jobkorea.js        # 잡코리아 크롤러 테스트
├── 📁 data/                     # 수집된 공고 데이터 (자동생성)
├── 📁 survey/                   # 설문조사 페이지
├── 📁 archive/                  # 사용하지 않는 파일 보관
├── 📁 .github/workflows/        # GitHub Actions
│   └── daily-job-alert.yml
├── package.json
├── .env.example
└── README.md
```

## 기능

- **지능형 필터링**: 설문조사 기반 맞춤 공고 추천
- **학습 시스템**: 좋아요/싫어요 피드백으로 필터 성능 개선
- **중복 제거**: 동일 공고 자동 필터링
- **Supabase 연동**: 설문 응답 및 피드백 데이터 저장
