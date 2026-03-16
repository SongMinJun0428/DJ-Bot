# 🎵 DJ봇 (Discord Music Bot)

귀엽고 강력한 디스코드 음악 봇, **DJ봇**입니다!  
Discloud 환경에 최적화되어 있으며, Supabase를 이용해 서버 설정을 안전하게 보관합니다.

![DJ봇 심볼](https://i.imgur.com/8nNf6D8.png)

## 🚀 주요 기능
- **간편한 설정**: `/setup` 한 번으로 전용 음악 채널과 제어판 생성
- **고품질 음악**: 유튜브 검색 및 링크 재생 지원
- **직관적인 UI**: 버튼 클릭만으로 음악을 제어하는 세련된 패널
- **영구 저장**: Supabase를 통해 서버별 설정을 영구적으로 유지

---

## 🛠 사전 준비 사항 (Discord Developer Portal)

1. [Discord Developer Portal](https://discord.com/developers/applications) 접속
2. **New Application** 생성 (이름: DJ봇)
3. **Bot** 탭에서:
   - **Token** 복사 (나중에 `.env`에 사용)
   - **Message Content Intent** 활성화 (중요!)
   - **Server Members Intent** 활성화
4. **OAuth2 -> URL Generator**에서:
   - Scopes: `bot`, `applications.commands` 선택
   - Bot Permissions:
     - `View Channels`
     - `Send Messages`
     - `Embed Links`
     - `Read Message History`
     - `Connect`
     - `Speak`
     - `Use Application Commands`
     - `Manage Channels`
     - `Manage Messages`
   - 링크 생성 후 본인 서버에 초대

---

## ⚙️ 설정 방법 (.env)

`.env.example` 파일을 복사하여 `.env` 파일을 만들고 아래 값을 채워주세요.

```env
DISCORD_BOT_TOKEN=디스코드_봇_토큰
SUPABASE_URL=슈파베이스_URL
SUPABASE_KEY=슈파베이스_KEY
```

---

## ☁️ Discloud 업로드 방법

1. 프로젝트 폴더 내의 모든 파일을 선택합니다. ( 단, `node_modules` 폴더는 **제외**하세요! )
2. ZIP 파일로 압축합니다.
3. [Discloud Dashboard](https://discloudbot.com/dashboard)에 접속합니다.
4. **Add App**을 누르고 생성한 ZIP 파일을 업로드합니다.
5. 업로드가 완료되면 자동으로 실행됩니다.

---

## 📦 ZIP 압축 전 체크리스트
- [ ] `node_modules` 폴더가 포함되지 않았는가?
- [ ] `package.json`이 존재하는가?
- [ ] `discloud.config`가 존재하는가?
- [ ] `.env` 파일이 포함되었는가? (Discloud는 `.env` 파일을 함께 업로드해야 인식합니다)
- [ ] `index.js`가 존재하는가?

---

## 🔍 실행 후 로그 확인
1. Discloud Dashboard의 본인 앱 클릭
2. **Logs** 탭에서 실시간 로그 확인
3. `✅ Logged in as DJ봇#1234` 메시지가 뜨면 성공!

---

## 💡 사용자 가이드
- 서버 입장 후 `/setup` 명령어를 입력하세요.
- 생성된 `#dj봇-음악-제어` 채널에서 음악을 즐기세요!

> **주의**: Supabase SQL Schema를 반드시 본인의 Supabase 프로젝트에서 실행해야 설정 저장이 작동합니다. (`db/schema.sql` 참고)
