# 🎧 Alohang 스타일 디스코드 DJ 봇 설정 가이드 (README.md)

이 문서는 봇의 설치, 설정 및 사용 방법을 한국어로 자세히 설명합니다.

## 1. 봇 초기 설정 (Discord Developer Portal)

봇이 정상적으로 작동하려면 디스코드 개발자 포털에서 다음과 같은 설정이 필요합니다.

1.  **Privileged Gateway Intents**:
    *   [Discord Developer Portal](https://discord.com/developers/applications)에 접속합니다.
    *   해당 봇 애플리케이션을 선택합니다.
    *   **Bot** 메뉴로 이동하여 아래 3가지 항목을 모두 **ON**으로 켭니다.
        *   Presence Intent
        *   Server Members Intent
        *   **Message Content Intent** (가장 중요!)
    *   `Save Changes`를 눌러 저장합니다.

2.  **봇 초대 링크 만들기**:
    *   **OAuth2** -> **URL Generator** 메뉴로 이동합니다.
    *   `Scopes`에서 `bot`과 `applications.commands`를 체크합니다.
    *   `Bot Permissions`에서 아래 권한들을 체크합니다.
        *   Administrator (가장 간편함)
        *   또는 필수 권한: `Manage Channels`, `Send Messages`, `Embed Links`, `Connect`, `Speak`, `Use External Emojis`, `Read Message History`.
    *   생성된 URL을 복사하여 자신의 서버에 봇을 초대합니다.

## 2. 서버 및 채널 설정

봇을 서버에 초대한 후, 채널 자동 생성을 위해 아래 명령어를 사용하세요.

* 1.  **/설정 (`/setup`)**: 서버에 `DJ 봇 음악 채널`이라는 이름의 음악 전용 채널을 생성합니다.
    *   이 명령어를 실행하면 봇이 전용 **음악 전용 채널**을 자동으로 만듭니다.
    *   이 채널에는 상시 대시보드(인기차트, 검색 버튼 등)가 고정됩니다.
    *   채널의 메시지 입력란에 노래 제목을 그냥 입력하는 것만으로 재생이 가능합니다.

## 3. 주요 명령어 및 기능

*   **/play [제목/링크]**: 음악을 검색하거나 링크로 재생합니다. 제목 검색 시 상위 10개 중 선택할 수 있는 UI가 나타납니다.
*   **/skip**: 현재 곡을 건너뜁니다.
*   **/queue**: 현재 대기열을 확인합니다.
*   **/playlist**: 자신만의 플레이리스트를 만들고 관리합니다.
*   **/local [파일명]**: 보관 중인 MP3/MP4 파일을 재생합니다.

## 4. 자동 추천 (Autoplay) 기능

노래가 끝나고 더 이상 재생할 곡이 없으면, 봇이 방금 들은 곡과 유사한 추천 곡을 자동으로 찾아 재생합니다. 중단하고 싶다면 큐를 비우거나 음성 채널에서 봇을 퇴장시키면 됩니다.

## 5. 외부 서버(호스팅)에서 24시간 실행하는 방법

본인의 개인 컴퓨터를 계속 켜둘 수 없다면, 외부 클라우드 서버(VPS)나 호스팅 서비스를 이용해야 합니다.

### 방법 A: Railway (가장 추천 - 초보자용)
설정이 매우 간단하며, GitHub와 연동하여 자동으로 배포할 수 있습니다.
1.  [Railway.app](https://railway.app/)에 가입합니다.
2.  이 코드 폴더를 본인의 **GitHub 레포지토리**에 업로드합니다.
3.  Railway에서 `New Project` -> `Deploy from GitHub repo`를 선택합니다.
4.  `Variables` 탭에서 `.env` 파일에 있는 내용(`DISCORD_TOKEN` 등)을 모두 추가합니다.
5.  **데이터 저장(중요)**: 
    *   기본적으로 Railway는 재배포 시 파일이 삭제됩니다. 
    *   플레이리스트 데이터를 유지하려면 Railway 설정에서 `/db` 폴더에 **Volume**을 연결해야 합니다. (잘 모르시겠다면 임시용으로 그냥 쓰셔도 무방합니다.)
6.  자동으로 배포가 시작되며, 완료되면 봇이 24시간 온라인 상태가 됩니다.

### 방법 B: VPS (리눅스 서버 - 숙련자용)
Oracle Cloud(무료), AWS, Google Cloud 등을 이용하는 방법입니다.
1.  Ubuntu 서버에 접속합니다 (SSH).
2.  Node.js와 Git을 설치합니다: 
    ```bash
    sudo apt update && sudo apt install -y nodejs npm git
    ```
3.  코드를 서버로 가져옵니다: `git clone <내-레포-주소>`
4.  폴더로 이동하여 패키지를 설치합니다: `npm install`
5.  **PM2**를 사용하여 백그라운드에서 실행합니다 (매우 중요!):
    ```bash
    sudo npm install -g pm2
    pm2 start index.js --name "dj-bot"
    pm2 save
    pm2 startup
    ```
    *PM2를 사용하면 서버가 재부팅되어도 봇이 자동으로 다시 켜집니다.*

---
봇 제작 및 코드 구현에 대해 궁금한 점이 더 있으시면 언제든 말씀해주세요!
