import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface User {
  id: string;
  nickname: string;
  socketId: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  message: string;
  timestamp: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('ChatGateway');
  private users: Map<string, User> = new Map();
  private messages: ChatMessage[] = [];

  afterInit(_server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // 사용자 목록에서 제거
    for (const [userId, user] of this.users.entries()) {
      if (user.socketId === client.id) {
        this.users.delete(userId);

        // 다른 사용자들에게 알림
        this.server.emit('userLeft', {
          userId,
          nickname: user.nickname,
          userCount: this.users.size,
        });

        this.logger.log(`User ${user.nickname} left the chat`);
        break;
      }
    }
  }

  @SubscribeMessage('joinChat')
  handleJoinChat(
    @MessageBody() data: { nickname: string },
    @ConnectedSocket() client: Socket,
  ) {
    // 이미 같은 소켓 ID로 등록된 사용자가 있는지 확인
    for (const user of this.users.values()) {
      if (user.socketId === client.id) {
        this.logger.log(`User already joined: ${user.nickname}`);
        return; // 이미 조인한 사용자이므로 중복 처리 방지
      }
    }

    const userId = this.generateUserId();
    const user: User = {
      id: userId,
      nickname: data.nickname,
      socketId: client.id,
    };

    this.users.set(userId, user);

    // 클라이언트에게 사용자 정보 전송
    client.emit('userJoined', {
      userId,
      nickname: data.nickname,
      userCount: this.users.size,
    });

    // 다른 사용자들에게 새 사용자 알림
    client.broadcast.emit('newUser', {
      userId,
      nickname: data.nickname,
      userCount: this.users.size,
    });

    // 기존 메시지 히스토리 전송
    client.emit('messageHistory', this.messages);

    this.logger.log(`User ${data.nickname} joined the chat`);
  }

  @SubscribeMessage('sendMessage')
  handleMessage(
    @MessageBody() data: { message: string },
    @ConnectedSocket() client: Socket,
  ) {
    // 소켓 ID로 사용자 찾기
    let sender: User | undefined;
    for (const user of this.users.values()) {
      if (user.socketId === client.id) {
        sender = user;
        break;
      }
    }

    if (!sender) {
      client.emit('error', { message: 'User not found' });
      return;
    }

    const chatMessage: ChatMessage = {
      id: this.generateMessageId(),
      userId: sender.id,
      nickname: sender.nickname,
      message: data.message,
      timestamp: new Date(),
    };

    // 메시지 저장 (메모리에, 실제로는 데이터베이스에 저장)
    this.messages.push(chatMessage);

    // 메시지 히스토리가 너무 길면 제한 (최근 100개만 유지)
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }

    // 모든 클라이언트에게 메시지 브로드캐스트
    this.server.emit('newMessage', chatMessage);

    this.logger.log(`Message from ${sender.nickname}: ${data.message}`);
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const userList = Array.from(this.users.values()).map((user) => ({
      id: user.id,
      nickname: user.nickname,
    }));

    client.emit('onlineUsers', {
      users: userList,
      userCount: this.users.size,
    });
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
