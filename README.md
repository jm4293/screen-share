# Screen Share Chat Application

실시간 화면 공유 채팅 애플리케이션입니다.

## 프로젝트 구조

```
screen-share/
├── backend/          # NestJS 백엔드 서버
├── frontend/         # React 프론트엔드
├── package.json      # 루트 패키지 설정
└── README.md
```

## 기술 스택

### Backend
- **NestJS** v11.0.1
- **Socket.IO** - 실시간 통신
- **TypeScript**

### Frontend  
- **React** v19.1.0
- **Vite** - 빌드 도구
- **Socket.IO Client** - 실시간 통신
- **TypeScript**

## 설치 및 실행

### 전체 프로젝트 의존성 설치
```bash
npm install
```

### 개발 서버 실행

#### Backend 서버 (포트 3001)
```bash
cd backend
npm run start
```

#### Frontend 서버 (포트 5173)
```bash
cd frontend  
npm run dev
```

## 기능

- ✅ 실시간 채팅
- ✅ 닉네임 기반 사용자 구분
- ✅ 온라인 사용자 수 표시
- ✅ 메시지 히스토리
- ✅ 중복 연결 방지
- ✅ 자동 채팅방 참가
- ✅ 반응형 UI

## API 엔드포인트

### WebSocket Events

#### Client → Server
- `joinChat` - 채팅방 참가
- `sendMessage` - 메시지 전송
- `getOnlineUsers` - 온라인 사용자 목록 요청

#### Server → Client  
- `userJoined` - 사용자 참가 알림
- `newUser` - 새 사용자 참가
- `userLeft` - 사용자 퇴장
- `newMessage` - 새 메시지
- `messageHistory` - 메시지 히스토리
- `onlineUsers` - 온라인 사용자 목록
- `error` - 에러 메시지

## 개발 정보

- **개발 환경**: macOS, Node.js v22.16.0
- **패키지 매니저**: npm
- **개발 도구**: VS Code, ESLint, Prettier
