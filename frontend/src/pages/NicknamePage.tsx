import { useNavigate } from "react-router-dom";
import NicknameInput from "../components/NicknameInput";

function NicknamePage() {
  const navigate = useNavigate();

  const handleNicknameSubmit = (nickname: string) => {
    // 닉네임을 localStorage에 저장하여 다른 페이지에서 사용할 수 있게 함
    localStorage.setItem("nickname", nickname);
    navigate("/chat");
  };

  return <NicknameInput onNicknameSubmit={handleNicknameSubmit} />;
}

export default NicknamePage;
