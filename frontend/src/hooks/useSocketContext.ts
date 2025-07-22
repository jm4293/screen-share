import { useContext } from "react";
import { SocketContext } from "../contexts/SocketContext";
import type { SocketContextType } from "../contexts/SocketContext";

export const useSocketContext = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
};
