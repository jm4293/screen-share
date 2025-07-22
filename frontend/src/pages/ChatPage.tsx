import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PrivateChat from "../components/PrivateChat";

function ChatPage() {
  const navigate = useNavigate();

  const [nickname, setNickname] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetNickname, setTargetNickname] = useState<string | null>(null);

  useEffect(() => {
    const storedNickname = sessionStorage.getItem("nickname");
    const storedTargetUserId = sessionStorage.getItem("targetUserId");
    const storedTargetNickname = sessionStorage.getItem("targetNickname");

    if (!storedNickname || !storedTargetUserId || !storedTargetNickname) {
      navigate("/users");
    } else {
      setNickname(storedNickname);
      setTargetUserId(storedTargetUserId);
      setTargetNickname(storedTargetNickname);
    }
  }, [navigate]);

  const handleLogout = () => {
    // sessionStorage에서 모든 정보 제거
    sessionStorage.removeItem("nickname");
    sessionStorage.removeItem("targetUserId");
    sessionStorage.removeItem("targetNickname");
    navigate("/");
  };

  // 필요한 정보가 로드되지 않았으면 로딩 표시
  if (!nickname || !targetUserId || !targetNickname) {
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

  return (
    <PrivateChat
      nickname={nickname}
      targetUserId={targetUserId}
      targetNickname={targetNickname}
      onLeave={handleLogout}
    />
  );
}

export default ChatPage;
