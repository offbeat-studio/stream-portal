import * as vscode from 'vscode';
import { TwitchChatManager } from './twitch/twitchChatManager';
import { ChatPanelProvider } from './ui/chatPanelProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('StreamPortal extension is now activating...');

    try {
        // Initialize Twitch Chat Manager
        console.log('Initializing TwitchChatManager...');
        const twitchChatManager = new TwitchChatManager(context);

        // Initialize Chat Panel Provider
        console.log('Initializing ChatPanelProvider...');
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
        console.log('Registering commands...');
        const helloWorldCommand = vscode.commands.registerCommand('streamPortal.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from VSCode Twitch Chatroom!');
        });

        // Connect command
        const connectCommand = vscode.commands.registerCommand('streamPortal.connect', async () => {
        try {
            if (twitchChatManager.isConnected()) {
                vscode.window.showInformationMessage('Already connected to Twitch chat');
                return;
            }

            // Ask user for channel name
            const channel = await vscode.window.showInputBox({
                prompt: 'Enter Twitch channel name to join',
                placeHolder: 'channelname',
                ignoreFocusOut: true
            }) || '';

            if (!channel) {
                return;
            }

            // Attempt to connect
            const success = await twitchChatManager.connectToChannel(channel);
            if (success) {
                console.log(`Successfully connected to channel: ${channel}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to connect: ${errorMessage}`);
        }
        });

        // Disconnect command
        const disconnectCommand = vscode.commands.registerCommand('streamPortal.disconnect', async () => {
        try {
            await twitchChatManager.disconnect();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to disconnect: ${errorMessage}`);
        }
        });

        // Send message command
        const sendMessageCommand = vscode.commands.registerCommand('streamPortal.sendMessage', async () => {
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
        const logoutCommand = vscode.commands.registerCommand('streamPortal.logout', async () => {
        try {
            await twitchChatManager.logout();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Logout failed: ${errorMessage}`);
        }
        });

        // Show chat panel command
        const showChatPanelCommand = vscode.commands.registerCommand('streamPortal.showChatPanel', async () => {
        // Focus on the chat panel view
            vscode.commands.executeCommand('streamPortal.chatPanel.focus');
        });

        // Add commands to the context subscriptions
        console.log('Registering commands to context subscriptions...');
        context.subscriptions.push(
            helloWorldCommand, 
            connectCommand, 
            disconnectCommand,
            sendMessageCommand,
            logoutCommand,
            showChatPanelCommand,
            twitchChatManager,
            chatPanelProvider
        );
        
        console.log('StreamPortal extension activated successfully!');
    } catch (error) {
        console.error('Failed to activate StreamPortal extension:', error);
        vscode.window.showErrorMessage(`StreamPortal failed to activate: ${error}`);
    }
}

export function deactivate() {
    console.log('VSCode Twitch Chatroom extension is deactivated');
}