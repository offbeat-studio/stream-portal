import * as vscode from 'vscode';
import { TwitchChatManager } from '../twitch/twitchChatManager';

export class LogoutCommand {
    static readonly COMMAND_ID = 'streamPortal.logout';

    constructor(private chatManager: TwitchChatManager) {}

    async execute(): Promise<void> {
        try {
            const confirmLogout = await vscode.window.showWarningMessage(
                'Are you sure you want to logout from Twitch? This will disconnect from chat and remove stored credentials.',
                { modal: true },
                'Logout',
                'Cancel'
            );

            if (confirmLogout !== 'Logout') {
                return;
            }

            await this.chatManager.logout();
            vscode.window.showInformationMessage('Successfully logged out from Twitch');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Logout failed: ${errorMessage}`);
        }
    }
}