import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { SocketProvider } from "./contexts/SocketContext";
import NicknamePage from "./pages/NicknamePage";
import UserListPage from "./pages/UserListPage";
import ChatPage from "./pages/ChatPage";
import "./App.css";

function App() {
  return (
    <div className="app">
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/" element={<NicknamePage />} />
            <Route path="/users" element={<UserListPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Routes>
        </Router>
      </SocketProvider>
    </div>
  );
}

export default App;
