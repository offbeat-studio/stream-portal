import * as vscode from 'vscode';
import { TokenManager } from './tokenManager';
import { OAuthFlow } from './oauthFlow';
import { TwitchConfig, AuthResult } from '../types/twitch';

export class AuthManager {
    private tokenManager: TokenManager;
    private oauthFlow: OAuthFlow;
    private config: TwitchConfig;

    constructor(context: vscode.ExtensionContext) {
        this.tokenManager = new TokenManager(context);
        
        // Get configuration from VSCode settings
        this.config = this.getConfigFromSettings();
        this.oauthFlow = new OAuthFlow(this.config);
    }

    async authenticate(): Promise<AuthResult> {
        try {
            // First try to use existing token
            await this.tokenManager.getStoredTokens();
            
            if (this.tokenManager.hasValidToken()) {
                const token = await this.tokenManager.getStoredTokens();
                return { success: true, token: token! };
            }

            // Try to refresh token if we have one
            const refreshToken = this.tokenManager.getRefreshToken();
            if (refreshToken) {
                try {
                    const newTokenData = await this.oauthFlow.refreshAccessToken(refreshToken);
                    await this.tokenManager.storeTokens(newTokenData);
                    return { success: true, token: newTokenData };
                } catch (error) {
                    console.warn('Token refresh failed, starting new auth flow:', error);
                    // Clear invalid tokens and continue to new auth flow
                    await this.tokenManager.clearTokens();
                }
            }

            // Start new OAuth flow
            return await this.oauthFlow.startFlow();
            
        } catch (error) {
            console.error('Authentication error:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Authentication failed' 
            };
        }
    }

    isAuthenticated(): boolean {
        return this.tokenManager.hasValidToken();
    }

    getAccessToken(): string | null {
        return this.tokenManager.getAccessToken();
    }

    async refreshToken(): Promise<void> {
        const refreshToken = this.tokenManager.getRefreshToken();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const newTokenData = await this.oauthFlow.refreshAccessToken(refreshToken);
            await this.tokenManager.storeTokens(newTokenData);
        } catch (error) {
            // If refresh fails, clear tokens
            await this.tokenManager.clearTokens();
            throw error;
        }
    }

    async logout(): Promise<void> {
        await this.tokenManager.clearTokens();
        vscode.window.showInformationMessage('Logged out from Twitch');
    }

    getTokenInfo() {
        return this.tokenManager.getTokenInfo();
    }

    private getConfigFromSettings(): TwitchConfig {
        const configuration = vscode.workspace.getConfiguration('twitchChatroom');
        
        // These should be configured by the user
        const clientId = configuration.get<string>('clientId', '');
        const clientSecret = configuration.get<string>('clientSecret', '');
        const redirectUri = configuration.get<string>('redirectUri', 'http://localhost:3000/auth/callback');
        
        return {
            clientId,
            clientSecret,
            redirectUri,
            scopes: ['chat:read', 'chat:edit']
        };
    }

    updateConfig(config: Partial<TwitchConfig>): void {
        this.config = { ...this.config, ...config };
        this.oauthFlow = new OAuthFlow(this.config);
    }

    validateConfig(): { isValid: boolean; missingFields: string[] } {
        const missingFields: string[] = [];
        
        if (!this.config.clientId) {
            missingFields.push('clientId');
        }
        if (!this.config.clientSecret) {
            missingFields.push('clientSecret');
        }
        if (!this.config.redirectUri) {
            missingFields.push('redirectUri');
        }

        return {
            isValid: missingFields.length === 0,
            missingFields
        };
    }
}