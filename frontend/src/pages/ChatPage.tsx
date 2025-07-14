import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatRoom from "../components/ChatRoom";

function ChatPage() {
  const navigate = useNavigate();

  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    const storedNickname = localStorage.getItem("nickname");

    if (!storedNickname) {
      navigate("/");
    } else {
      setNickname(storedNickname);
    }
  }, []);

  const handleLogout = () => {
    // localStorage에서 닉네임 제거
    localStorage.removeItem("nickname");
    navigate("/");
  };

  // 닉네임이 로드되지 않았으면 로딩 표시
  if (!nickname) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        로딩 중...
      </div>
    );
  }

  return <ChatRoom nickname={nickname} onLeave={handleLogout} />;
}

export default ChatPage;
