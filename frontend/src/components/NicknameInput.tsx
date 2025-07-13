import { useState } from "react";
import "./NicknameInput.css";

interface NicknameInputProps {
  onNicknameSubmit: (nickname: string) => void;
}

function NicknameInput({ onNicknameSubmit }: NicknameInputProps) {
  const [nickname, setNickname] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      onNicknameSubmit(nickname.trim());
    }
  };

  return (
    <div className="nickname-container">
      <div className="nickname-form-wrapper">
        <h1>환영합니다!</h1>
        <p>채팅을 시작하기 위해 닉네임을 입력해주세요.</p>
        <form onSubmit={handleSubmit} className="nickname-form">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임을 입력하세요"
            className="nickname-input"
            maxLength={20}
            autoFocus
          />
          <button type="submit" className="nickname-submit-btn" disabled={!nickname.trim()}>
            채팅 시작하기
          </button>
        </form>
      </div>
    </div>
  );
}

export default NicknameInput;
