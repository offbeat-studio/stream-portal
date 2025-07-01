import * as vscode from 'vscode';
import { TwitchChatManager } from './twitch/twitchChatManager';
import { ChatPanelProvider } from './ui/chatPanelProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('VSCode Twitch Chatroom extension is now active!');

    // Initialize Twitch Chat Manager
    const twitchChatManager = new TwitchChatManager(context);

    // Initialize Chat Panel Provider
    const chatPanelProvider = new ChatPanelProvider(context.extensionUri, twitchChatManager);
    
    // Register the webview view provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatPanelProvider.viewType,
            chatPanelProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true
                }
            }
        )
    );

    // Hello World command for testing
    const helloWorldCommand = vscode.commands.registerCommand('twitchChatroom.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from VSCode Twitch Chatroom!');
    });

    // Connect command
    const connectCommand = vscode.commands.registerCommand('twitchChatroom.connect', async () => {
        try {
            if (twitchChatManager.isConnected()) {
                vscode.window.showInformationMessage('Already connected to Twitch chat');
                return;
            }

            // Get channel from configuration or ask user
            const config = vscode.workspace.getConfiguration('twitchChatroom');
            let channel = config.get<string>('channel', '');

            if (!channel) {
                channel = await vscode.window.showInputBox({
                    prompt: 'Enter Twitch channel name to join',
                    placeHolder: 'channelname',
                    ignoreFocusOut: true
                }) || '';

                if (!channel) {
                    return;
                }

                // Save channel to settings for future use
                await config.update('channel', channel, vscode.ConfigurationTarget.Global);
            }

            // Attempt to connect
            const success = await twitchChatManager.connectToChannel(channel);
            if (success) {
                // Set up chat message logging for now
                twitchChatManager.onChatMessage((message) => {
                    console.log(`[${message.channel}] ${message.displayName}: ${message.message}`);
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to connect: ${errorMessage}`);
        }
    });

    // Disconnect command
    const disconnectCommand = vscode.commands.registerCommand('twitchChatroom.disconnect', async () => {
        try {
            await twitchChatManager.disconnect();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to disconnect: ${errorMessage}`);
        }
    });

    // Send message command
    const sendMessageCommand = vscode.commands.registerCommand('twitchChatroom.sendMessage', async () => {
        try {
            if (!twitchChatManager.isConnected()) {
                vscode.window.showWarningMessage('Not connected to Twitch chat');
                return;
            }

            const message = await vscode.window.showInputBox({
                prompt: 'Enter message to send to chat',
                placeHolder: 'Type your message...',
                ignoreFocusOut: true
            });

            if (message) {
                const success = await twitchChatManager.sendMessage(message);
                if (success) {
                    vscode.window.showInformationMessage('Message sent successfully');
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to send message: ${errorMessage}`);
        }
    });

    // Logout command
    const logoutCommand = vscode.commands.registerCommand('twitchChatroom.logout', async () => {
        try {
            await twitchChatManager.logout();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Logout failed: ${errorMessage}`);
        }
    });

    // Add commands to the context subscriptions
    context.subscriptions.push(
        helloWorldCommand, 
        connectCommand, 
        disconnectCommand,
        sendMessageCommand,
        logoutCommand,
        twitchChatManager
    );
}

export function deactivate() {
    console.log('VSCode Twitch Chatroom extension is deactivated');
}