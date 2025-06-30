import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    console.log('VSCode Twitch Chatroom extension is now active!');

    // Hello World command for testing
    const helloWorldCommand = vscode.commands.registerCommand('twitchChatroom.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from VSCode Twitch Chatroom!');
    });

    // Connect command placeholder
    const connectCommand = vscode.commands.registerCommand('twitchChatroom.connect', () => {
        vscode.window.showInformationMessage('Connect command executed - Coming soon!');
    });

    // Disconnect command placeholder
    const disconnectCommand = vscode.commands.registerCommand('twitchChatroom.disconnect', () => {
        vscode.window.showInformationMessage('Disconnect command executed - Coming soon!');
    });

    // Add commands to the context subscriptions
    context.subscriptions.push(helloWorldCommand, connectCommand, disconnectCommand);

    // Show status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(comment-discussion) Twitch Chat";
    statusBarItem.tooltip = "Twitch Chatroom Extension";
    statusBarItem.command = 'twitchChatroom.helloWorld';
    statusBarItem.show();
    
    context.subscriptions.push(statusBarItem);
}

export function deactivate() {
    console.log('VSCode Twitch Chatroom extension is deactivated');
}