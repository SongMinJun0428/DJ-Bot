# 🎧 프리미엄 오디오 스트리밍 DJ BOT (v4.2.1 Master)

이 프로젝트는 최신 Lavalink 엔진을 기반으로 하며, 고품격 **Premium Gold & Onyx** 디자인을 적용한 정식 통합 버전입니다. (v4.2.1 Master Edition)

---

## 🌟 v4.2.1 마스터 업데이트 주요 내용 (Consolidation)

- **💎 Premium Gold UI (Complete)**: 모든 임베드와 버튼에 럭셔리 골드 테마(`#BFA054`)를 적용하여 시각적 일관성을 확보했습니다.
- **📂 통합 라이브러리 허브 (Stable)**: 즐겨찾기와 플레이리스트를 번호 선택 방식으로 통합하여 가장 직관적인 UX를 제공합니다.
- **🎧 끊김 없는 재생 시스템 (Smooth Transition)**:
  - **자동 재생 v2.1**: 노래가 끝나기 전 미리 다음 곡을 추천받고, 대기열이 비어도 10초간 사용자를 기다리는 지능형 로직을 갖췄습니다.
  - **고성능 배치 로딩**: 수십 곡의 플레이리스트도 렉 없이 순식간에 대기열에 추가됩니다.
- **⏳ 실시간 시간 동기화**: `Now Playing` 화면에서 남은 시간이 실시간으로 정확하게 표시되도록 데이터 연동을 마쳤습니다.
- **💾 안정적인 데이터 관리 (Upsert)**: 서버 설정 및 자동 재생 ON/OFF 값이 유실되지 않도록 DB 정밀 수리를 완료했습니다.

---

## 1. 초기 연동 및 권한 설정

봇의 완벽한 가동을 위해 디스코드 개발자 포털의 **Bot** 메뉴에서 아래 항목을 반드시 활성화하세요.

*   **Message Content Intent**: ON (사용자 메시지 처리 필수)
*   **Presence Intent**: ON
*   **Server Members Intent**: ON

---

## 2. 서버 전용 채널 설정 (`/setup`)

봇을 서버에 접속시킨 후, **/setup (`/설정`)** 명령어를 입력하세요.
*   **고품격 대시보드 자동 생성**: 인기차트, 플레이리스트, 자동재생 스위치 등이 포함된 전용 채널이 구성됩니다.
*   **스마트 검색**: 채널에 노래 제목이나 링크만 입력하면 즉시 검색 결과 메뉴가 나타납니다.

---

## 3. 기술 사양 (Performance Specs)

*   **Runtime**: Node.js **v22.12.0+**
*   **Audio Engine**: Lavalink v4.0.0 (High Performance Cluster)
*   **Data Stacks**: Better-SQLite3, Shoukaku, Kazagumo
*   **Skin**: Premium Gold Onyx (Custom CSS based Embeds)

---

## 4. 실행 및 배포 가이드

### 로컬 테스트
```bash
npm install
node index.js
```

### 상시 구동 (PM2)
```bash
pm2 start index.js --name "dj-master"
```

---
최신 기술과 고품격 디자인이 결합된 **v4.2.1 Master Edition**과 함께 최고의 음악 환경을 구축해 보세요! 🚀🎧🏆
