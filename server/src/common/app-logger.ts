import { ConsoleLogger, LogLevel } from '@nestjs/common';

/**
 * Nest's console logger with optional colours. ANSI colour codes are unreadable in hosted
 * log viewers (they show up as raw escape sequences), so they are only enabled locally.
 *
 * Colours are on for local development and off on Render (which sets RENDER=true) or when
 * NODE_ENV=production. LOG_COLORS=true/false overrides this.
 */
export class AppLogger extends ConsoleLogger {
  private readonly colors = AppLogger.shouldUseColors();

  private static shouldUseColors(): boolean {
    if (process.env.LOG_COLORS) return process.env.LOG_COLORS === 'true';
    return !process.env.RENDER && process.env.NODE_ENV !== 'production';
  }

  protected colorize(message: string, logLevel: LogLevel): string {
    return this.colors ? super.colorize(message, logLevel) : message;
  }

  // Nest colours the [Context] tag separately from the message.
  protected formatContext(context: string): string {
    if (this.colors) return super.formatContext(context);
    return context ? `[${context}] ` : '';
  }
}
