import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { JsonWebTokenError, JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import { Strategy } from 'passport-custom';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { config } from '@shared/config/config';

export const AUTH_HEADER = 'X-Custom-Key';
const JWT_SECRET = config.JWT_SECRET;

export interface InternalJwtPayload extends JwtPayload {
  username: string;
  id: number;
  email: string;
  isApproved: boolean;
  scope: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super();
  }

  async validate(request: Request): Promise<InternalJwtPayload> {
    const token = (request.header(AUTH_HEADER.toLowerCase()) ?? '') as string;

    if (!token) {
      throw new UnauthorizedException('MissingToken');
    }

    try {
      jwt.verify(token, JWT_SECRET);
      const payload = jwt.decode(token) as InternalJwtPayload;

      if (!payload.username || !payload.id || !payload.email || typeof payload.isApproved === 'undefined') {
        throw new BadRequestException('InvalidPayload');
      }

      if (!payload.isApproved) {
        throw new UnauthorizedException('ApprovalRequired');
      }

      return {
        username: payload.username,
        id: payload.id,
        email: payload.email,
        isApproved: payload.isApproved,
        scope: payload.scope,
      };
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new BadRequestException('InvalidJSONObject');
      } else if (e instanceof TokenExpiredError) {
        throw new UnauthorizedException('ExpiredToken');
      } else if (e instanceof JsonWebTokenError) {
        throw new BadRequestException('InvalidToken');
      }

      throw e;
    }
  }
}
