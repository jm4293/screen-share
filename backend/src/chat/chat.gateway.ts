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
  status: 'online' | 'chatting'; // 사용자 상태 추가
}

interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  message: string;
  timestamp: Date;
  isPrivate?: boolean; // 1:1 메시지인지 구분
  targetUserId?: string; // 1:1 메시지의 대상 사용자
}

// 1:1 채팅방 정보
interface PrivateRoom {
  id: string;
  participants: string[]; // 참가자 userId 배열
  messages: ChatMessage[]; // 해당 방의 메시지들
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
  private privateRooms: Map<string, PrivateRoom> = new Map(); // 1:1 채팅방 관리

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // 연결된 클라이언트에게 환영 메시지 전송
    client.emit('connected', {
      socketId: client.id,
      message: '서버에 성공적으로 연결되었습니다!',
      timestamp: new Date(),
    });

    // 현재 온라인 사용자 수 전송
    client.emit('connectionInfo', {
      totalConnections: this.server.engine.clientsCount,
      serverTime: new Date(),
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // 사용자 목록에서 제거
    for (const [userId, user] of this.users.entries()) {
      if (user.socketId === client.id) {
        // 임시로 알림 비활성화 - 테스트용
        // if (user.status === 'chatting') {
        //   setTimeout(() => {
        //     this.notifyPrivateChatDisconnection(userId);
        //   }, 1000); // 1초 지연
        // }

        // 사용자 삭제
        this.users.delete(userId);

        // 모든 사용자에게 업데이트된 사용자 리스트 전송
        this.broadcastUserList();

        this.logger.log(`User ${user.nickname} left the chat`);
        break;
      }
    }
  }

  @SubscribeMessage('joinLobby')
  handleJoinLobby(
    @MessageBody() data: { nickname: string },
    @ConnectedSocket() client: Socket,
  ) {
    // 이미 같은 소켓 ID로 등록된 사용자가 있는지 확인
    for (const user of this.users.values()) {
      if (user.socketId === client.id) {
        this.logger.log(`User already joined: ${user.nickname}`);
        // 이미 조인한 사용자라도 현재 사용자 목록을 전송
        this.broadcastUserList();
        return; // 이미 조인한 사용자이므로 중복 처리 방지
      }
    }

    const userId = this.generateUserId();
    const user: User = {
      id: userId,
      nickname: data.nickname,
      socketId: client.id,
      status: 'online',
    };

    this.users.set(userId, user);

    // 클라이언트에게 사용자 정보 전송
    client.emit('lobbyJoined', {
      userId,
      nickname: data.nickname,
    });

    // 모든 사용자에게 업데이트된 사용자 리스트 전송
    this.broadcastUserList();

    this.logger.log(`User ${data.nickname} joined the lobby`);
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

  @SubscribeMessage('getUserList')
  handleGetUserList(@ConnectedSocket() client: Socket) {
    const userList = Array.from(this.users.values()).map((user) => ({
      id: user.id,
      nickname: user.nickname,
      status: user.status,
    }));

    client.emit('userList', userList);
  }

  // 1:1 채팅 시작
  @SubscribeMessage('startPrivateChat')
  handleStartPrivateChat(
    @MessageBody() data: { targetUserId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const sender = this.findUserBySocketId(client.id);
    if (!sender) {
      client.emit('error', { message: 'User not found' });
      return;
    }

    const targetUser = this.users.get(data.targetUserId);
    if (!targetUser) {
      client.emit('error', { message: 'Target user not found' });
      return;
    }

    // 상대방이 이미 채팅 중인지 확인
    if (targetUser.status === 'chatting') {
      client.emit('error', { message: 'Target user is already chatting' });
      return;
    }

    // 본인이 이미 채팅 중인지 확인
    if (sender.status === 'chatting') {
      client.emit('error', { message: 'You are already chatting' });
      return;
    }

    // 1:1 방 ID 생성 (두 사용자 ID를 정렬해서)
    const roomId = this.createPrivateRoomId(sender.id, data.targetUserId);

    // 방이 없으면 생성
    if (!this.privateRooms.has(roomId)) {
      this.privateRooms.set(roomId, {
        id: roomId,
        participants: [sender.id, data.targetUserId],
        messages: [],
      });
    }

    // 두 사용자를 방에 참가시키기
    void client.join(roomId);
    void this.server.sockets.sockets.get(targetUser.socketId)?.join(roomId);

    // 두 사용자의 상태를 'chatting'으로 변경
    sender.status = 'chatting';
    targetUser.status = 'chatting';

    const room = this.privateRooms.get(roomId)!;

    // 양쪽 사용자에게 1:1 채팅 시작 알림
    this.server.to(roomId).emit('privateChatStarted', {
      roomId,
      participants: [
        { id: sender.id, nickname: sender.nickname },
        { id: targetUser.id, nickname: targetUser.nickname },
      ],
      messages: room.messages, // 기존 메시지 히스토리
    });

    // 모든 사용자에게 업데이트된 사용자 리스트 전송
    this.broadcastUserList();

    this.logger.log(
      `Private chat started between ${sender.nickname} and ${targetUser.nickname}`,
    );
  }

  // 1:1 메시지 전송
  @SubscribeMessage('sendPrivateMessage')
  handlePrivateMessage(
    @MessageBody() data: { targetUserId: string; message: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(
      `📩 Private message received: ${data.message} from ${client.id} to ${data.targetUserId}`,
    );

    const sender = this.findUserBySocketId(client.id);
    if (!sender) {
      this.logger.error(`❌ Sender not found for socket ${client.id}`);
      client.emit('error', { message: 'User not found' });
      return;
    }

    const targetUser = this.users.get(data.targetUserId);
    if (!targetUser) {
      this.logger.error(`❌ Target user not found: ${data.targetUserId}`);
      client.emit('error', { message: 'Target user not found' });
      return;
    }

    const roomId = this.createPrivateRoomId(sender.id, data.targetUserId);
    const room = this.privateRooms.get(roomId);

    if (!room) {
      this.logger.error(`❌ Private chat room not found: ${roomId}`);
      client.emit('error', { message: 'Private chat room not found' });
      return;
    }

    this.logger.log(`✅ Sending message in room ${roomId}`);

    const privateMessage: ChatMessage = {
      id: this.generateMessageId(),
      userId: sender.id,
      nickname: sender.nickname,
      message: data.message,
      timestamp: new Date(),
      isPrivate: true,
      targetUserId: data.targetUserId,
    };

    // 방의 메시지 저장
    room.messages.push(privateMessage);
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }

    // 해당 방의 두 사용자에게만 메시지 전송
    this.server.to(roomId).emit('newPrivateMessage', privateMessage);

    this.logger.log(
      `📤 Private message sent from ${sender.nickname} to ${targetUser.nickname}: ${data.message}`,
    );
  }

  // 1:1 채팅방 나가기
  @SubscribeMessage('leavePrivateChat')
  handleLeavePrivateChat(
    @MessageBody() data: { targetUserId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const sender = this.findUserBySocketId(client.id);
    if (!sender) return;

    const targetUser = this.users.get(data.targetUserId);
    if (targetUser) {
      // 두 사용자의 상태를 'online'으로 변경
      sender.status = 'online';
      targetUser.status = 'online';
    }

    const roomId = this.createPrivateRoomId(sender.id, data.targetUserId);
    void client.leave(roomId);

    // 상대방에게 나갔다는 알림
    client.to(roomId).emit('privateChatLeft', {
      userId: sender.id,
      nickname: sender.nickname,
    });

    // 모든 사용자에게 업데이트된 사용자 리스트 전송
    this.broadcastUserList();

    this.logger.log(
      `${sender.nickname} left private chat with user ${data.targetUserId}`,
    );
  }

  // 1:1 채팅 히스토리 가져오기
  @SubscribeMessage('getPrivateChatHistory')
  handleGetPrivateChatHistory(
    @MessageBody() data: { targetUserId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const sender = this.findUserBySocketId(client.id);
    if (!sender) {
      client.emit('error', { message: 'User not found' });
      return;
    }

    const roomId = this.createPrivateRoomId(sender.id, data.targetUserId);
    const room = this.privateRooms.get(roomId);

    client.emit('privateChatHistory', {
      roomId,
      targetUserId: data.targetUserId,
      messages: room?.messages || [],
    });
  }

  // 헬퍼 메서드들
  private createPrivateRoomId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('-private-');
  }

  private findUserBySocketId(socketId: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.socketId === socketId) {
        return user;
      }
    }
    return undefined;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 모든 사용자에게 사용자 리스트 브로드캐스트
  private broadcastUserList(): void {
    const userList = Array.from(this.users.values()).map((user) => ({
      id: user.id,
      nickname: user.nickname,
      status: user.status,
    }));

    this.server.emit('userListUpdated', userList);
  }

  // 1:1 채팅 중 연결 해제 알림
  private notifyPrivateChatDisconnection(disconnectedUserId: string): void {
    for (const [, room] of this.privateRooms.entries()) {
      if (room.participants.includes(disconnectedUserId)) {
        // 상대방 찾기
        const otherUserId = room.participants.find(
          (id) => id !== disconnectedUserId,
        );
        if (otherUserId) {
          const otherUser = this.users.get(otherUserId);
          if (otherUser) {
            // 상대방의 상태를 'online'으로 변경
            otherUser.status = 'online';
            // 상대방에게 연결 해제 알림
            this.server.to(otherUser.socketId).emit('privateChatDisconnected', {
              disconnectedUserId,
              message: '상대방이 연결을 해제했습니다.',
            });

            this.logger.log(
              `Notified user ${otherUser.nickname} about disconnection of ${disconnectedUserId}`,
            );
          }
        }
      }
    }
  }
}

// 1. 서버 시작
//    ↓
// 2. afterInit() 호출 ✨ (서버 초기화 완료)
//    ↓
// 3. 클라이언트A 연결
//    ↓
// 4. handleConnection(clientA) 호출 ✨
//    ↓
// 5. 클라이언트B 연결
//    ↓
// 6. handleConnection(clientB) 호출 ✨
//    ↓
// 7. 클라이언트A 연결 해제
//    ↓
// 8. handleDisconnect(clientA) 호출 ✨
