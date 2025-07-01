/**
 * StreamPortal Error System
 * Unified error handling for consistent user experience
 */

export abstract class StreamPortalError extends Error {
    public readonly timestamp: Date;
    public readonly userMessage: string;
    public readonly technicalMessage: string;

    constructor(userMessage: string, technicalMessage?: string, originalError?: Error) {
        super(technicalMessage || userMessage);
        this.name = this.constructor.name;
        this.timestamp = new Date();
        this.userMessage = userMessage;
        this.technicalMessage = technicalMessage || userMessage;
        
        if (originalError && originalError.stack) {
            this.stack = originalError.stack;
        }
        
        Error.captureStackTrace(this, this.constructor);
    }
}

export class AuthenticationError extends StreamPortalError {
    constructor(message: string, technicalMessage?: string, originalError?: Error) {
        super(
            message || 'Authentication failed. Please check your Twitch credentials.',
            technicalMessage,
            originalError
        );
    }
}

export class ConnectionError extends StreamPortalError {
    public readonly retryable: boolean;

    constructor(message: string, retryable = true, technicalMessage?: string, originalError?: Error) {
        super(
            message || 'Connection failed. Please check your internet connection.',
            technicalMessage,
            originalError
        );
        this.retryable = retryable;
    }
}

export class ChannelError extends StreamPortalError {
    public readonly channelName: string;

    constructor(channelName: string, message?: string, technicalMessage?: string, originalError?: Error) {
        super(
            message || `Failed to join channel "${channelName}". The channel may not exist or be unavailable.`,
            technicalMessage,
            originalError
        );
        this.channelName = channelName;
    }
}

export class APIError extends StreamPortalError {
    public readonly statusCode: number | undefined;
    public readonly rateLimited: boolean;

    constructor(message: string, statusCode?: number, technicalMessage?: string, originalError?: Error) {
        const isRateLimited = statusCode === 429;
        super(
            isRateLimited 
                ? 'API rate limit exceeded. Please wait a moment before trying again.'
                : message || 'API request failed. Please try again later.',
            technicalMessage,
            originalError
        );
        this.statusCode = statusCode;
        this.rateLimited = isRateLimited;
    }
}

export class ConfigurationError extends StreamPortalError {
    public readonly missingFields: string[];

    constructor(missingFields: string[], message?: string, technicalMessage?: string) {
        super(
            message || `Configuration incomplete. Missing: ${missingFields.join(', ')}. Please check Settings → Extensions → StreamPortal.`,
            technicalMessage
        );
        this.missingFields = missingFields;
    }
}

export class MessageError extends StreamPortalError {
    constructor(message: string, technicalMessage?: string, originalError?: Error) {
        super(
            message || 'Failed to send message. Please try again.',
            technicalMessage,
            originalError
        );
    }
}

/**
 * Error Handler for consistent error processing
 */
export class ErrorHandler {
    private static instance: ErrorHandler;

    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * Handle error with appropriate user feedback
     */
    public handleError(error: Error | StreamPortalError, context?: string): void {
        const errorInfo = this.processError(error, context);
        
        // Log technical details
        console.error(`[StreamPortal Error] ${errorInfo.technical}`);
        if (error.stack) {
            console.error(error.stack);
        }

        // Show user-friendly message
        this.showUserMessage(errorInfo.user, errorInfo.severity);
    }

    /**
     * Process error into user and technical messages
     */
    private processError(error: Error | StreamPortalError, context?: string): {
        user: string;
        technical: string;
        severity: 'error' | 'warning' | 'info';
    } {
        if (error instanceof StreamPortalError) {
            return {
                user: error.userMessage,
                technical: `${context ? `[${context}] ` : ''}${error.technicalMessage}`,
                severity: this.getSeverity(error)
            };
        }

        // Handle unknown errors
        const fallbackMessage = context 
            ? `An unexpected error occurred during ${context}. Please try again.`
            : 'An unexpected error occurred. Please try again.';

        return {
            user: fallbackMessage,
            technical: `${context ? `[${context}] ` : ''}${error.message}`,
            severity: 'error'
        };
    }

    /**
     * Determine error severity
     */
    private getSeverity(error: StreamPortalError): 'error' | 'warning' | 'info' {
        if (error instanceof ConnectionError && error.retryable) {
            return 'warning';
        }
        if (error instanceof APIError && error.rateLimited) {
            return 'warning';
        }
        return 'error';
    }

    /**
     * Show user message via VSCode API
     */
    private showUserMessage(message: string, severity: 'error' | 'warning' | 'info'): void {
        // This will be injected by the actual implementation
        try {
            // Try to access window in webview context
            const globalWindow = (globalThis as any).window;
            if (globalWindow?.vscode) {
                // Webview context
                globalWindow.vscode.postMessage({
                    type: 'error',
                    severity,
                    message
                });
                return;
            }
        } catch {
            // Ignore window access errors
        }
        
        // Extension context - will be handled by the consumer
        console.log(`[${severity.toUpperCase()}] ${message}`);
    }
}

/**
 * Utility function for consistent error handling
 */
export function handleError(error: Error | StreamPortalError, context?: string): void {
    ErrorHandler.getInstance().handleError(error, context);
}

/**
 * Utility function to wrap async operations with error handling
 */
export async function withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    fallbackValue?: T
): Promise<T | undefined> {
    try {
        return await operation();
    } catch (error) {
        handleError(error as Error, context);
        return fallbackValue;
    }
}