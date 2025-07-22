import { useCallback, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  message: string;
  timestamp: Date;
  isPrivate?: boolean;
  targetUserId?: string;
}

interface User {
  id: string;
  nickname: string;
  status: "online" | "chatting";
}

// 전역 소켓 관리
let globalSocket: Socket | null = null;
let socketInitialized = false;

const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);

  const initializeSocket = useCallback(() => {
    // 이미 초기화되었거나 연결 중인 경우 기존 소켓 반환
    if (socketInitialized && globalSocket?.connected) {
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
    });

    globalSocket.on("disconnect", (reason) => {
      console.log("❌ 서버 연결 해제:", reason);
      socketInitialized = false;
      setSocket(null);
    });

    globalSocket.on("error", (error) => {
      console.error("❌ 소켓 에러:", error);
    });

    // 1:1 채팅 메시지 수신
    globalSocket.on("newPrivateMessage", (message: ChatMessage) => {
      console.log("💬 새 1:1 메시지:", message);
      setPrivateMessages((prev) => [...prev, message]);
    });

    // 1:1 채팅 연결 해제 알림
    globalSocket.on("privateChatDisconnected", (data) => {
      console.log("🔌 1:1 채팅 연결 해제:", data);
      alert(data.message);
    });

    // 1:1 채팅 상대방이 나갔을 때
    globalSocket.on("privateChatLeft", (data) => {
      console.log("👋 상대방이 채팅을 나감:", data);
      alert(`${data.nickname}님이 채팅을 나갔습니다.`);
    });

    setSocket(globalSocket);
    return globalSocket;
  }, []);

  // 로비 입장 (닉네임 입력 후)
  const joinLobby = useCallback(
    (nickname: string) => {
      const currentSocket = globalSocket || initializeSocket();
      if (currentSocket && currentSocket.connected) {
        console.log("🚪 로비 입장:", nickname);
        currentSocket.emit("joinLobby", { nickname });
      }
    },
    [initializeSocket]
  );

  // 1:1 채팅 메시지 전송
  const sendPrivateMessage = useCallback((targetUserId: string, message: string) => {
    if (globalSocket && globalSocket.connected) {
      console.log("💌 1:1 메시지 전송:", { targetUserId, message });
      globalSocket.emit("sendPrivateMessage", { targetUserId, message });
    }
  }, []);

  // 1:1 채팅 나가기
  const leavePrivateChat = useCallback((targetUserId: string) => {
    if (globalSocket && globalSocket.connected) {
      console.log("👋 1:1 채팅 나가기:", targetUserId);
      globalSocket.emit("leavePrivateChat", { targetUserId });
      setPrivateMessages([]); // 메시지 초기화
    }
  }, []);

  // 연결 해제
  const disconnect = useCallback(() => {
    if (globalSocket) {
      console.log("🔌 소켓 연결 해제");
      globalSocket.removeAllListeners();
      globalSocket.disconnect();
      globalSocket = null;
      socketInitialized = false;
      setSocket(null);
      setOnlineUsers([]);
      setMessages([]);
      setPrivateMessages([]);
    }
  }, []);

  // 컴포넌트 마운트 시 소켓 초기화
  useEffect(() => {
    if (!socketInitialized) {
      initializeSocket();
    }

    return () => {
      // 컴포넌트 언마운트 시에는 소켓을 유지 (다른 컴포넌트에서 사용할 수 있음)
    };
  }, [initializeSocket]);

  return {
    socket,
    onlineUsers,
    messages,
    privateMessages,
    joinLobby,
    sendPrivateMessage,
    leavePrivateChat,
    disconnect,
  };
};

export default useSocket;
