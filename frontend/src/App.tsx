import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NicknamePage from "./pages/NicknamePage";
import "./App.css";
import ChatPage from "./pages/ChatPage";

function App() {
  return (
    <div className="app">
      <Router>
        <Routes>
          <Route path="/" element={<NicknamePage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
