import React, { createContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface User {
  id: string;
  nickname: string;
  status: "online" | "chatting";
}

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  message: string;
  timestamp: Date;
  isPrivate?: boolean;
  targetUserId?: string;
}

interface SocketContextType {
  socket: Socket | null;
  users: User[];
  privateMessages: ChatMessage[];
  currentUserId: string | null;
  joinLobby: (nickname: string) => void;
  sendPrivateMessage: (targetUserId: string, message: string) => void;
  startPrivateChat: (targetUserId: string) => void;
  leavePrivateChat: (targetUserId: string) => void;
  disconnect: () => void;
}

export type { SocketContextType };

const SocketContext = createContext<SocketContextType | null>(null);

export { SocketContext };

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef<boolean>(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // 이미 연결이 있으면 재사용
    if (socketRef.current?.connected) {
      setSocket(socketRef.current);
      return;
    }

    // 새 연결 생성
    const newSocket = io("http://localhost:3001", {
      forceNew: false,
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;

    // 이벤트 리스너 설정
    newSocket.on("connect", () => {
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      setSocket(null);
      setCurrentUserId(null);
      joinedRef.current = false;
    });

    newSocket.on("userListUpdated", (userList: User[]) => {
      setUsers(userList);
    });

    newSocket.on("userList", (userList: User[]) => {
      setUsers(userList);
    });

    newSocket.on("lobbyJoined", (data: { userId: string; nickname: string }) => {
      setCurrentUserId(data.userId);
    });

    newSocket.on("newPrivateMessage", (message: ChatMessage) => {
      setPrivateMessages((prev) => [...prev, message]);
    });

    // cleanup - 개발 모드에서 연결 유지
    return () => {
      if (import.meta.env.DEV) {
        // 개발 모드에서는 리스너만 제거
        newSocket.removeAllListeners();
      } else {
        // 프로덕션에서는 완전히 해제
        newSocket.disconnect();
      }
    };
  }, []);

  const joinLobby = (nickname: string) => {
    if (socket && !joinedRef.current) {
      joinedRef.current = true;
      socket.emit("joinLobby", { nickname });
    }
  };

  const sendPrivateMessage = (targetUserId: string, message: string) => {
    socket?.emit("sendPrivateMessage", { targetUserId, message });
  };

  const startPrivateChat = (targetUserId: string) => {
    socket?.emit("startPrivateChat", { targetUserId });
  };

  const leavePrivateChat = (targetUserId: string) => {
    socket?.emit("leavePrivateChat", { targetUserId });
    setPrivateMessages([]);
  };

  const disconnect = () => {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      setSocket(null);
      setPrivateMessages([]);
    }
  };

  const value: SocketContextType = {
    socket,
    users,
    privateMessages,
    currentUserId,
    joinLobby,
    sendPrivateMessage,
    startPrivateChat,
    leavePrivateChat,
    disconnect,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
