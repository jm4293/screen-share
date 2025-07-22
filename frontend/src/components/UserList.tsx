import { useEffect, useRef } from "react";
import { useSocketContext } from "../hooks/useSocketContext";
import "./UserList.css";

interface ChatMessage {
  id: string;
  nickname: string;
  message: string;
  timestamp: Date;
  isPrivate?: boolean;
  targetUserId?: string;
}

interface IProps {
  nickname: string;
  onLogout: () => void;
  onStartChat: (targetUserId: string, targetNickname: string) => void;
}

const UserList = (props: IProps) => {
  const { nickname, onLogout, onStartChat } = props;
  const { socket, users, currentUserId, joinLobby, disconnect } = useSocketContext(); // currentUserId를 SocketContext에서 가져옴
  const joinedRef = useRef(false);

  useEffect(() => {
    if (nickname && socket && socket.connected && !joinedRef.current) {
      joinLobby(nickname);
      joinedRef.current = true;
    }

    return () => {
      joinedRef.current = false;
    };
  }, [nickname, socket, joinLobby, disconnect]);

  useEffect(() => {
    if (!socket) return;

    // 로비 입장 성공 - SocketContext에서 currentUserId를 관리하므로 여기서는 추가 처리 없음
    const handleLobbyJoined = () => {
      // 로비 입장 성공 처리 (필요시 추가 로직)
    };

    // 1:1 채팅 시작됨
    const handlePrivateChatStarted = (data: {
      roomId: string;
      participants: Array<{ id: string; nickname: string }>;
      messages: ChatMessage[];
    }) => {
      // 상대방 정보 찾기
      const targetUser = data.participants.find((p) => p.id !== currentUserId);
      if (targetUser) {
        onStartChat(targetUser.id, targetUser.nickname);
      }
    };

    // 에러 처리
    const handleError = (data: { message: string }) => {
      alert(data.message);
    };

    socket.on("lobbyJoined", handleLobbyJoined);
    socket.on("privateChatStarted", handlePrivateChatStarted);
    socket.on("error", handleError);

    return () => {
      socket.off("lobbyJoined", handleLobbyJoined);
      socket.off("privateChatStarted", handlePrivateChatStarted);
      socket.off("error", handleError);
    };
  }, [socket, currentUserId, onStartChat]);

  const handleStartPrivateChat = (targetUserId: string) => {
    if (socket && currentUserId) {
      socket.emit("startPrivateChat", { targetUserId });
    }
  };

  const handleLogout = () => {
    joinedRef.current = false;
    disconnect();
    onLogout();
  };

  // 본인을 제외한 사용자들만 필터링
  const otherUsers = users.filter((user) => user.id !== currentUserId);

  return (
    <div className="user-list-container">
      <div className="user-list-header">
        <h2>사용자 목록</h2>
        <div className="header-info">
          <span className="nickname">안녕하세요, {nickname}님!</span>
          <span className="online-count">온라인: {users.length}명</span>
          <button className="logout-button" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </div>

      <div className="user-list-content">
        {otherUsers.length === 0 ? (
          <div className="no-users">
            <p>다른 사용자가 없습니다.</p>
            <p>다른 사용자가 접속하기를 기다려주세요.</p>
          </div>
        ) : (
          <div className="users-grid">
            {otherUsers.map((user) => (
              <div key={user.id} className="user-card">
                <div className="user-info">
                  <div className="user-nickname">{user.nickname}</div>
                  <div className={`user-status ${user.status}`}>
                    {user.status === "online" ? "온라인" : "채팅 중..."}
                  </div>
                </div>
                <button
                  className={`chat-button ${user.status === "chatting" ? "disabled" : ""}`}
                  onClick={() => handleStartPrivateChat(user.id)}
                  disabled={user.status === "chatting"}
                >
                  {user.status === "online" ? "채팅하기" : "채팅 중"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;
