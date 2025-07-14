import React, { useState, useEffect, useRef } from "react";
import useSocket from "../hooks/useSocket";
import "./ChatRoom.css";

interface IProps {
  nickname: string;
  onLeave: () => void;
}

const ChatRoom = (props: IProps) => {
  const { nickname, onLeave } = props;

  const { socket, onlineUsers, messages, joinChat, sendMessage, disconnect } = useSocket();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const joinedRef = useRef(false);

  const [inputMessage, setInputMessage] = useState("");

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

  useEffect(() => {
    if (nickname) {
      joinChat(nickname);
      joinedRef.current = true;
    }

    return () => {
      if (joinedRef.current) {
        disconnect();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-room">
      <div className="chat-header">
        <h2>채팅방</h2>
        <div className="header-info">
          <span className="online-count">접속자: {onlineUsers}명</span>
          <span className="nickname">닉네임: {nickname}</span>
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
