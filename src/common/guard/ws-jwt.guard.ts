import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = this.extractTokenFromSocket(client);
    this.logger.debug(`Extracted token: ${token || 'none'}`);

    if (!token) {
      this.logger.error('No token provided');
      throw new WsException('No token provided');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      this.logger.debug(`Using JWT_SECRET: ${secret ? 'set' : 'unset'}`);
      const payload = await this.jwtService.verifyAsync(token, { secret });
      this.logger.debug(`Token payload: ${JSON.stringify(payload)}`);

      if (!client.data.user) {
        client.data.user = payload;
      }
      return true;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      if (error.name === 'TokenExpiredError') {
        throw new WsException('Token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new WsException('Invalid token');
      }
      throw new WsException('Unauthorized: Token verification failed');
    }
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    const authHeader = client.handshake.headers.authorization;
    const authToken = client.handshake.auth?.token;
    this.logger.debug(`Auth header: ${authHeader}, Auth token: ${authToken}`);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.replace('Bearer ', '');
    }
    return authToken;
  }
}