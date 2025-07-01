import * as vscode from 'vscode';
import * as http from 'http';
import * as url from 'url';
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
            
            // Start local server to receive callback
            const { server, authCodePromise } = await this.startCallbackServer();
            
            // Build authorization URL
            const authUrl = this.buildAuthUrl(state);
            
            // Open browser for user authorization
            await vscode.env.openExternal(vscode.Uri.parse(authUrl));
            
            vscode.window.showInformationMessage('Opening browser for Twitch authorization...');
            
            try {
                // Wait for authorization code from callback
                const { code, receivedState } = await authCodePromise;
                
                // Verify state parameter for CSRF protection
                if (receivedState !== state) {
                    throw new Error('Invalid state parameter - possible CSRF attack');
                }
                
                // Exchange code for tokens
                const tokenData = await this.exchangeCodeForTokens(code);
                
                return { success: true, token: tokenData };
            } finally {
                // Always close the server
                server.close();
            }
        } catch (error) {
            console.error('OAuth flow error:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            };
        }
    }

    private async startCallbackServer(): Promise<{
        server: http.Server;
        authCodePromise: Promise<{ code: string; receivedState: string }>;
    }> {
        return new Promise((resolve, reject) => {
            let authCodeResolve: (value: { code: string; receivedState: string }) => void;
            let authCodeReject: (error: Error) => void;
            
            const authCodePromise = new Promise<{ code: string; receivedState: string }>((res, rej) => {
                authCodeResolve = res;
                authCodeReject = rej;
            });
            
            const server = http.createServer((req, res) => {
                try {
                    if (!req.url) {
                        throw new Error('No URL in request');
                    }
                    
                    const parsedUrl = url.parse(req.url, true);
                    const query = parsedUrl.query;
                    
                    // Send success page to browser
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Authorization Successful</title>
                            <style>
                                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                                .success { color: #4CAF50; }
                                .container { max-width: 500px; margin: 0 auto; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1 class="success">✅ Authorization Successful!</h1>
                                <p>You have successfully authorized VSCode Twitch Chatroom.</p>
                                <p>You can now close this browser window and return to VSCode.</p>
                            </div>
                        </body>
                        </html>
                    `);
                    
                    if (query.error) {
                        authCodeReject(new Error(`Authorization error: ${query.error}`));
                    } else if (query.code && query.state) {
                        authCodeResolve({
                            code: query.code as string,
                            receivedState: query.state as string
                        });
                    } else {
                        authCodeReject(new Error('Missing authorization code or state'));
                    }
                } catch (error) {
                    console.error('Callback server error:', error);
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Authorization Error</title>
                            <style>
                                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                                .error { color: #f44336; }
                                .container { max-width: 500px; margin: 0 auto; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1 class="error">❌ Authorization Error</h1>
                                <p>An error occurred during authorization.</p>
                                <p>Please try again in VSCode.</p>
                            </div>
                        </body>
                        </html>
                    `);
                    authCodeReject(error instanceof Error ? error : new Error('Unknown callback error'));
                }
            });
            
            // Extract port from redirect URI
            const redirectUrl = new URL(this.config.redirectUri);
            const port = parseInt(redirectUrl.port) || 7777;
            
            server.listen(port, 'localhost', () => {
                console.log(`OAuth callback server listening on port ${port}`);
                resolve({ server, authCodePromise });
            });
            
            server.on('error', (error) => {
                console.error('Server error:', error);
                reject(error);
            });
            
            // Timeout after 5 minutes
            setTimeout(() => {
                authCodeReject(new Error('Authorization timeout - please try again'));
                server.close();
            }, 5 * 60 * 1000);
        });
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

            if (response.ok) {
                const validationData = await response.json() as any;
                console.log('Token validation data:', JSON.stringify(validationData, null, 2));
                console.log('Token scopes:', validationData.scopes);
                console.log('Token expires in:', validationData.expires_in, 'seconds');
                console.log('Client ID matches:', validationData.client_id === this.config.clientId);
                
                // Check if token has required scopes for IRC
                const requiredScopes = ['chat:read', 'chat:edit'];
                const hasRequiredScopes = requiredScopes.every(scope => 
                    validationData.scopes && validationData.scopes.includes(scope)
                );
                console.log('Has required IRC scopes:', hasRequiredScopes);
                
                return true;
            } else {
                console.error('Token validation failed:', response.status, await response.text());
                return false;
            }
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