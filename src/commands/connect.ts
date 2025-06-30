import * as vscode from 'vscode';
import { BaseCommand } from '../types/extension';

export class ConnectCommand extends BaseCommand {
    execute(): void {
        if (!this.validate()) {
            return;
        }
        
        try {
            vscode.window.showInformationMessage('Connect command executed - Coming soon!');
        } catch (error) {
            this.handleError(error as Error);
        }
    }
    
    protected override validate(): boolean {
        return true;
    }
}