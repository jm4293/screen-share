import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import UserList from "../components/UserList";

function UserListPage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    const storedNickname = sessionStorage.getItem("nickname");

    if (!storedNickname) {
      navigate("/");
    } else {
      setNickname(storedNickname);
    }
  }, [navigate]); // joinLobby 호출 제거

  const handleLogout = () => {
    sessionStorage.removeItem("nickname");
    navigate("/");
  };

  const handleStartChat = (targetUserId: string, targetNickname: string) => {
    // 채팅 대상 정보를 sessionStorage에 저장
    sessionStorage.setItem("targetUserId", targetUserId);
    sessionStorage.setItem("targetNickname", targetNickname);
    navigate("/chat");
  };

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

  return <UserList nickname={nickname} onLogout={handleLogout} onStartChat={handleStartChat} />;
}

export default UserListPage;
