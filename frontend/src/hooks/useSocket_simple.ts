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

const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);

  // 로비 입장 (닉네임 입력 후)
  const joinLobby = useCallback(
    (nickname: string) => {
      if (socket && socket.connected) {
        console.log("🚪 로비 입장:", nickname);
        socket.emit("joinLobby", { nickname });
      }
    },
    [socket]
  );

  // 1:1 채팅 메시지 전송
  const sendPrivateMessage = useCallback(
    (targetUserId: string, message: string) => {
      if (socket && socket.connected) {
        console.log("💌 1:1 메시지 전송:", { targetUserId, message });
        socket.emit("sendPrivateMessage", { targetUserId, message });
      }
    },
    [socket]
  );

  // 1:1 채팅 나가기
  const leavePrivateChat = useCallback(
    (targetUserId: string) => {
      if (socket && socket.connected) {
        console.log("👋 1:1 채팅 나가기:", targetUserId);
        socket.emit("leavePrivateChat", { targetUserId });
        setPrivateMessages([]); // 메시지 초기화
      }
    },
    [socket]
  );

  // 연결 해제
  const disconnect = useCallback(() => {
    if (socket) {
      console.log("🔌 소켓 연결 해제");
      socket.removeAllListeners();
      socket.disconnect();
      setSocket(null);
      setOnlineUsers([]);
      setMessages([]);
      setPrivateMessages([]);
    }
  }, [socket]);

  // 컴포넌트 마운트 시 소켓 초기화
  useEffect(() => {
    console.log("🔧 소켓 초기화 시작");

    // 새 소켓 생성
    const newSocket = io("http://localhost:3001", {
      transports: ["websocket"],
      forceNew: true,
      autoConnect: true,
    });

    // 이벤트 리스너 설정
    newSocket.on("connect", () => {
      console.log("✅ 서버에 연결됨:", newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ 서버 연결 해제:", reason);
      setSocket(null);
    });

    newSocket.on("error", (error) => {
      console.error("❌ 소켓 에러:", error);
    });

    // 1:1 채팅 메시지 수신
    newSocket.on("newPrivateMessage", (message: ChatMessage) => {
      console.log("💬 새 1:1 메시지:", message);
      setPrivateMessages((prev) => [...prev, message]);
    });

    // 1:1 채팅 연결 해제 알림
    newSocket.on("privateChatDisconnected", (data) => {
      console.log("🔌 1:1 채팅 연결 해제:", data);
      alert(data.message);
    });

    // 1:1 채팅 상대방이 나갔을 때
    newSocket.on("privateChatLeft", (data) => {
      console.log("👋 상대방이 채팅을 나감:", data);
      alert(`${data.nickname}님이 채팅을 나갔습니다.`);
    });

    // 컴포넌트 언마운트 시 정리
    return () => {
      console.log("🧹 소켓 정리");
      newSocket.removeAllListeners();
      newSocket.disconnect();
    };
  }, []);

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
