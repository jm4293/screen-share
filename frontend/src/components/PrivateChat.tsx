import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSocketContext } from "../hooks/useSocketContext";
import "./PrivateChat.css";

interface IProps {
  nickname: string;
  targetUserId: string;
  targetNickname: string;
  onLeave: () => void;
}

const PrivateChat = (props: IProps) => {
  const { nickname, targetUserId, targetNickname, onLeave } = props;
  const navigate = useNavigate();

  const { socket, privateMessages, sendPrivateMessage, leavePrivateChat } = useSocketContext();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputMessage, setInputMessage] = useState("");

  const handleSendMessage = () => {
    if (inputMessage.trim() && socket && socket.connected) {
      sendPrivateMessage(targetUserId, inputMessage.trim());
      setInputMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLeave = () => {
    leavePrivateChat(targetUserId);
    onLeave();
  };

  const handleBackToUserList = () => {
    leavePrivateChat(targetUserId);
    navigate("/users");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [privateMessages]);

  useEffect(() => {
    if (!socket) return;

    // 1:1 채팅 연결 해제 시 사용자 리스트로 이동
    const handlePrivateChatDisconnected = () => {
      alert("상대방이 연결을 해제했습니다.");
      navigate("/users");
    };

    const handlePrivateChatLeft = (data: { userId: string; nickname: string }) => {
      alert(`${data.nickname}님이 채팅을 나갔습니다.`);
      navigate("/users");
    };

    socket.on("privateChatDisconnected", handlePrivateChatDisconnected);
    socket.on("privateChatLeft", handlePrivateChatLeft);

    return () => {
      socket.off("privateChatDisconnected", handlePrivateChatDisconnected);
      socket.off("privateChatLeft", handlePrivateChatLeft);
    };
  }, [socket, navigate]);

  return (
    <div className="private-chat">
      <div className="private-chat-header">
        <button className="back-button" onClick={handleBackToUserList}>
          ← 사용자 목록
        </button>
        <h2>{targetNickname}님과의 채팅</h2>
        <div className="header-info">
          <span className="nickname">{nickname}</span>
          <button className="leave-button" onClick={handleLeave}>
            로그아웃
          </button>
        </div>
      </div>

      <div className="messages-container">
        {privateMessages.length === 0 ? (
          <div className="no-messages">
            <p>{targetNickname}님과의 채팅을 시작하세요!</p>
          </div>
        ) : (
          privateMessages.map((message) => (
            <div
              key={message.id}
              className={`message ${message.nickname === nickname ? "own-message" : "other-message"}`}
            >
              <div className="message-content">
                {message.nickname !== nickname && <div className="message-nickname">{message.nickname}</div>}
                <div className="message-text">{message.message}</div>
                <div className="message-time">{new Date(message.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={`${targetNickname}님에게 메시지를 입력하세요...`}
          className="message-input"
          disabled={!socket?.connected}
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputMessage.trim() || !socket?.connected}
          className="send-button"
        >
          전송
        </button>
      </div>
    </div>
  );
};

export default PrivateChat;
