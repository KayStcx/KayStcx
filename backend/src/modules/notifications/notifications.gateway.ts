import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { Notification } from './entities/notification.entity';

@WebSocketGateway({
    cors: {
        origin: '*', // Adjust for production
    },
})
export class NotificationsGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(NotificationsGateway.name);

    constructor(private readonly jwtService: JwtService) { }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token);
            const userId = payload.sub || payload.id;

            client.join(`user_${userId}`);
            this.logger.log(`Client connected and joined room user_${userId}`);
        } catch (error) {
            this.logger.error(`Connection error: ${error.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    sendNotification(userId: string, notification: Notification) {
        this.server.to(`user_${userId}`).emit('newNotification', notification);
    }
}
