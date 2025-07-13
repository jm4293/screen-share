import React, { useState, useEffect, useRef } from "react";
import useSocket from "../hooks/useSocket";
import "./ChatRoom.css";

interface ChatRoomProps {
  nickname: string;
  onLeave: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ nickname, onLeave }) => {
  const { socket, onlineUsers, messages, joinChat, sendMessage, disconnect } = useSocket();
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    console.log("ChatRoom useEffect triggered:", {
      nickname,
      socketConnected: socket?.connected,
      hasJoinedRef: joinedRef.current,
      socketId: socket?.id,
    });

    // 닉네임이 있고, 소켓이 연결되었으며, 아직 조인하지 않았을 때만 조인
    if (nickname && socket?.connected && !joinedRef.current) {
      console.log("All conditions met - joining chat with nickname:", nickname);
      joinChat(nickname);
      joinedRef.current = true;
    } else {
      console.log("Conditions not met for joining:", {
        hasNickname: !!nickname,
        socketConnected: socket?.connected,
        alreadyJoined: joinedRef.current,
      });
    }
  }, [nickname, socket?.connected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (inputMessage.trim() && socket && socket.connected) {
      sendMessage(nickname, inputMessage.trim());
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
    joinedRef.current = false;
    disconnect();
    onLeave();
  };

  const handleTestJoin = () => {
    console.log("Manual join test");
    joinChat(nickname);
  };

  const handleTestMessage = () => {
    console.log("Manual message test");
    sendMessage(nickname, "테스트 메시지");
  };

  return (
    <div className="chat-room">
      <div className="chat-header">
        <h2>채팅방</h2>
        <div className="header-info">
          <span className="online-count">접속자: {onlineUsers}명</span>
          <span className="nickname">닉네임: {nickname}</span>
          <button onClick={handleTestJoin} style={{marginRight: '5px', backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px'}}>
            조인
          </button>
          <button onClick={handleTestMessage} style={{marginRight: '5px', backgroundColor: '#2196F3', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '3px'}}>
            테스트 메시지
          </button>
          <button onClick={handleLeave} className="leave-button">
            나가기
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className="message">
            <span className="message-nickname">{msg.nickname}: </span>
            <span className="message-text">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="메시지를 입력하세요..."
          className="message-input"
        />
        <button onClick={handleSendMessage} className="send-button">
          전송
        </button>
      </div>
    </div>
  );
};

export default ChatRoom;
