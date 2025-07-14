import { useCallback, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  message: string;
  timestamp: Date;
}

interface User {
  id: string;
  nickname: string;
}

// 전역 소켓 관리
let globalSocket: Socket | null = null;
let socketInitialized = false;

const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const initializeSocket = useCallback(() => {
    // 이미 초기화되었거나 연결 중인 경우 기존 소켓 반환
    if (socketInitialized && globalSocket) {
      setSocket(globalSocket);
      return globalSocket;
    }

    // 기존 소켓이 있으면 정리
    if (globalSocket) {
      globalSocket.removeAllListeners();
      globalSocket.disconnect();
    }

    // 새 소켓 생성
    globalSocket = io("http://localhost:3001", {
      transports: ["websocket"],
      forceNew: false,
      autoConnect: true,
    });

    // 이벤트 리스너 설정
    globalSocket.on("connect", () => {
      console.log("✅ 서버에 연결됨:", globalSocket?.id);
      socketInitialized = true;
      setSocket(globalSocket);

      // 연결 후 조금 기다린 후 상태 업데이트
      setTimeout(() => {
        setSocket(globalSocket);
      }, 100);
    });

    // 서버에서 보내는 연결 확인 메시지
    globalSocket.on("connected", (data: { socketId: string; message: string; timestamp: Date }) => {
      console.log("🎉 서버 연결 확인:", data);
    });

    // 서버에서 보내는 연결 정보
    globalSocket.on("connectionInfo", (data: { totalConnections: number; serverTime: Date }) => {
      console.log("📊 연결 정보:", data);
    });

    globalSocket.on("disconnect", () => {
      console.log("❌ 서버 연결 해제");
      socketInitialized = false;
    });

    // 사용자가 채팅방에 참가했을 때
    globalSocket.on("userJoined", (data: { userId: string; nickname: string; userCount: number }) => {
      setOnlineUsers(data.userCount);
    });

    // 새 사용자가 들어왔을 때
    globalSocket.on("newUser", (data: { userId: string; nickname: string; userCount: number }) => {
      setOnlineUsers(data.userCount);
    });

    // 사용자가 나갔을 때
    globalSocket.on("userLeft", (data: { userId: string; nickname: string; userCount: number }) => {
      setOnlineUsers(data.userCount);
    });

    // 메시지 히스토리 받기
    globalSocket.on("messageHistory", (history: ChatMessage[]) => {
      setMessages(history);
    });

    // 새 메시지 받기
    globalSocket.on("newMessage", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    // 온라인 사용자 목록
    globalSocket.on("onlineUsers", (data: { users: User[]; userCount: number }) => {
      setOnlineUsers(data.userCount);
    });

    // 에러 처리
    globalSocket.on("error", (error: { message: string }) => {
      console.error("Socket error:", error);
    });

    setSocket(globalSocket);

    return globalSocket;
  }, []);

  const joinChat = useCallback(
    (nickname: string) => {
      const currentSocket = globalSocket || initializeSocket();

      if (currentSocket && currentSocket.connected) {
        currentSocket.emit("joinChat", { nickname });
      } else {
        // 소켓이 연결되지 않은 경우 재시도 로직
        if (currentSocket && !currentSocket.connected) {
          currentSocket.on("connect", () => {
            currentSocket.emit("joinChat", { nickname });
          });
        }
      }
    },
    [initializeSocket]
  );

  const sendMessage = useCallback((_nickname: string, message: string) => {
    if (globalSocket && globalSocket.connected) {
      globalSocket.emit("sendMessage", { message });
    }
  }, []);

  const disconnect = useCallback(() => {
    if (globalSocket) {
      globalSocket.removeAllListeners();
      globalSocket.disconnect();
      globalSocket = null;
      socketInitialized = false;
    }
    setSocket(null);
    setOnlineUsers(0);
    setMessages([]);
  }, []);

  useEffect(() => {
    if (!socketInitialized) {
      initializeSocket();
    }

    // 컴포넌트 언마운트 시 전역 소켓은 유지
    return () => {};
  }, [initializeSocket]);

  return {
    socket,
    onlineUsers,
    messages,
    joinChat,
    sendMessage,
    disconnect,
  };
};

export default useSocket;
