import * as vscode from 'vscode';
import { TwitchChatManager } from '../twitch/twitchChatManager';

export class SendMessageCommand {
    static readonly COMMAND_ID = 'twitchChatroom.sendMessage';

    constructor(private chatManager: TwitchChatManager) {}

    async execute(): Promise<void> {
        try {
            if (!this.chatManager.isConnected()) {
                vscode.window.showWarningMessage('Not connected to Twitch chat. Please connect first.');
                return;
            }

            const currentChannel = this.chatManager.getCurrentChannel();
            if (!currentChannel) {
                vscode.window.showWarningMessage('No channel joined. Please connect to a channel first.');
                return;
            }

            const message = await vscode.window.showInputBox({
                prompt: `Send message to ${currentChannel}`,
                placeHolder: 'Enter your message...',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Message cannot be empty';
                    }
                    if (value.length > 500) {
                        return 'Message too long (max 500 characters)';
                    }
                    return null;
                }
            });

            if (message === undefined) {
                return;
            }

            const success = await this.chatManager.sendMessage(message.trim());
            if (success) {
                vscode.window.showInformationMessage(`Message sent to ${currentChannel}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to send message: ${errorMessage}`);
        }
    }
}