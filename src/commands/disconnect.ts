import * as vscode from 'vscode';
import { BaseCommand } from '../types/extension';

export class DisconnectCommand extends BaseCommand {
    execute(): void {
        if (!this.validate()) {
            return;
        }
        
        try {
            vscode.window.showInformationMessage('Disconnect command executed - Coming soon!');
        } catch (error) {
            this.handleError(error as Error);
        }
    }
    
    protected override validate(): boolean {
        return true;
    }
}