import * as vscode from 'vscode';

export interface TwitchChatroomConfig {
    channel: string;
    username: string;
    autoConnect: boolean;
}

export interface CommandHandler {
    execute(context: vscode.ExtensionContext): Promise<void> | void;
}

export abstract class BaseCommand implements CommandHandler {
    abstract execute(context: vscode.ExtensionContext): Promise<void> | void;
    
    protected validate(): boolean {
        return true;
    }
    
    protected handleError(error: Error): void {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
        console.error('Command execution error:', error);
    }
}