import { Injectable } from '@nestjs/common';
////import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

interface Claims {
    sub: string;
    exp: number;
}

@Injectable()
export class AuthUtils {

    constructor(
        ////private readonly configService: ConfigService
    ) {}

    async hashPassword(input: string): Promise<string> {
        const saltRounds = parseInt(process.env.SALT_ROUNDS || '12', 12);
        if (!saltRounds) {
            console.log("No salt")
        }
        return await bcrypt.hash(input, 12);
    }

    async verifyPassword(password: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(password, hash);
    }

    generateToken(email: string, minutes: number): string {
        const secretKey = process.env.JWT_SECRET_KEY
        if (!secretKey) {
            throw new Error('JWT_SECRET_KEY not configured');
        }

        const expiration = Math.floor(Date.now() / 1000) + (minutes * 60);
        
        const claims: Claims = {
            sub: email,
            exp: expiration
        };

        return jwt.sign(claims, secretKey);
    }

    verifyToken(token: string): boolean {
        const secretKey = process.env.JWT_SECRET_KEY
        if (!secretKey) {
            throw new Error('JWT_SECRET_KEY not configured');
        }

        try {
            jwt.verify(token, secretKey);
            return true;
        } catch {
            return false;
        }
    }

    isTokenExpired(token: string): boolean {
        const secretKey = process.env.JWT_SECRET_KEY
        if (!secretKey) {
            throw new Error('JWT_SECRET_KEY not configured');
        }

        try {
            const decoded = jwt.verify(token, secretKey) as Claims;
            const now = Math.floor(Date.now() / 1000);
            return decoded.exp < now;
        } catch {
            return true; // Treat invalid token as expired
        }
    }
}