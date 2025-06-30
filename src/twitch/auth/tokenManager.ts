import * as vscode from 'vscode';
import { TokenData } from '../types/twitch';

export class TokenManager {
    private static readonly TOKEN_KEY = 'twitchTokenData';
    private tokenData: TokenData | null = null;

    constructor(private context: vscode.ExtensionContext) {}

    async storeTokens(tokens: TokenData): Promise<void> {
        // Calculate actual expiration time
        const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
        const tokenWithExpiration = {
            ...tokens,
            expiresAt
        };

        this.tokenData = tokenWithExpiration;
        
        // Store securely using VSCode's secret storage
        await this.context.secrets.store(
            TokenManager.TOKEN_KEY, 
            JSON.stringify(tokenWithExpiration)
        );
    }

    async getStoredTokens(): Promise<TokenData | null> {
        if (this.tokenData) {
            return this.tokenData;
        }

        try {
            const storedData = await this.context.secrets.get(TokenManager.TOKEN_KEY);
            if (!storedData) {
                return null;
            }

            const parsed = JSON.parse(storedData);
            // Convert expiresAt back to Date object
            if (parsed.expiresAt) {
                parsed.expiresAt = new Date(parsed.expiresAt);
            }

            this.tokenData = parsed;
            return this.tokenData;
        } catch (error) {
            console.error('Error retrieving stored tokens:', error);
            return null;
        }
    }

    isTokenExpired(): boolean {
        if (!this.tokenData?.expiresAt) {
            return true;
        }

        // Add 5 minute buffer to avoid using tokens that are about to expire
        const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
        return new Date().getTime() > (this.tokenData.expiresAt.getTime() - bufferTime);
    }

    getAccessToken(): string | null {
        if (!this.tokenData || this.isTokenExpired()) {
            return null;
        }
        return this.tokenData.accessToken;
    }

    getRefreshToken(): string | null {
        return this.tokenData?.refreshToken || null;
    }

    async clearTokens(): Promise<void> {
        this.tokenData = null;
        await this.context.secrets.delete(TokenManager.TOKEN_KEY);
    }

    hasValidToken(): boolean {
        return this.tokenData !== null && !this.isTokenExpired();
    }

    getTokenInfo(): { username?: string; scopes?: string[]; expiresAt?: Date } | null {
        if (!this.tokenData) {
            return null;
        }

        return {
            scopes: this.tokenData.scope,
            expiresAt: this.tokenData.expiresAt
        };
    }
}