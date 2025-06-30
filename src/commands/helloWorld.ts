import * as vscode from 'vscode';
import { BaseCommand } from '../types/extension';

export class HelloWorldCommand extends BaseCommand {
    execute(): void {
        if (!this.validate()) {
            return;
        }
        
        try {
            vscode.window.showInformationMessage('Hello World from VSCode Twitch Chatroom!');
        } catch (error) {
            this.handleError(error as Error);
        }
    }
    
    protected override validate(): boolean {
        return true;
    }
}