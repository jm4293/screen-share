import { io, Socket } from "socket.io-client";

// 전역 소켓 관리
class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = io("http://localhost:3001", {
      transports: ["websocket"],
      forceNew: true,
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      // 연결 성공 처리
    });

    this.socket.on("disconnect", () => {
      // 연결 해제 처리
    });

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default SocketManager;
