import * as vscode from 'vscode';
import fetch from 'node-fetch';
import { TwitchConfig, TokenData, AuthResult } from '../types/twitch';

export class OAuthFlow {
    private static readonly TWITCH_AUTH_URL = 'https://id.twitch.tv/oauth2/authorize';
    private static readonly TWITCH_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
    private static readonly TWITCH_VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate';

    constructor(private config: TwitchConfig) {}

    async startFlow(): Promise<AuthResult> {
        try {
            // Generate state parameter for CSRF protection
            const state = this.generateState();
            
            // Build authorization URL
            const authUrl = this.buildAuthUrl(state);
            
            // Open browser for user authorization
            await vscode.env.openExternal(vscode.Uri.parse(authUrl));
            
            // Show input box for authorization code
            const authCode = await vscode.window.showInputBox({
                prompt: 'Please enter the authorization code from the browser',
                placeHolder: 'Authorization code',
                ignoreFocusOut: true
            });

            if (!authCode) {
                return { success: false, error: 'Authorization cancelled by user' };
            }

            // Exchange code for tokens
            const tokenData = await this.exchangeCodeForTokens(authCode);
            
            return { success: true, token: tokenData };
        } catch (error) {
            console.error('OAuth flow error:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
        }
    }

    async exchangeCodeForTokens(code: string): Promise<TokenData> {
        const response = await fetch(OAuthFlow.TWITCH_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: this.config.redirectUri
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
        }

        const data = await response.json() as any;
        
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresIn: data.expires_in,
            scope: data.scope,
            tokenType: data.token_type,
            expiresAt: new Date(Date.now() + data.expires_in * 1000)
        };
    }

    async refreshAccessToken(refreshToken: string): Promise<TokenData> {
        const response = await fetch(OAuthFlow.TWITCH_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: this.config.clientId,
                client_secret: this.config.clientSecret,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
        }

        const data = await response.json() as any;
        
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || refreshToken, // Some responses don't include new refresh token
            expiresIn: data.expires_in,
            scope: data.scope,
            tokenType: data.token_type,
            expiresAt: new Date(Date.now() + data.expires_in * 1000)
        };
    }

    async validateToken(accessToken: string): Promise<boolean> {
        try {
            const response = await fetch(OAuthFlow.TWITCH_VALIDATE_URL, {
                method: 'GET',
                headers: {
                    'Authorization': `OAuth ${accessToken}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    private buildAuthUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            response_type: 'code',
            scope: this.config.scopes.join(' '),
            state: state
        });

        return `${OAuthFlow.TWITCH_AUTH_URL}?${params.toString()}`;
    }

    private generateState(): string {
        // Generate random state for CSRF protection
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
}