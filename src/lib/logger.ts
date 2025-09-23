// Enhanced logging utility for debugging Google Sheets operations

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  userId?: string;
  requestId?: string;
}

class Logger {
  private logLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  
  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
  }
  
  private createLogEntry(
    level: LogLevel,
    category: string,
    message: string,
    data?: Record<string, unknown>,
    userId?: string,
    requestId?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      userId,
      requestId
    };
  }
  
  private log(entry: LogEntry): void {
    // Add to in-memory logs
    this.logs.push(entry);
    
    // Trim logs if they exceed the maximum
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Only log to console if the level is at or above the configured level
    if (entry.level >= this.logLevel) {
      const levelName = LogLevel[entry.level];
      const prefix = `[${entry.timestamp}] [${levelName}] [${entry.category}]`;
      
      const logMessage = entry.data 
        ? `${prefix} ${entry.message} - Data: ${JSON.stringify(entry.data)}`
        : `${prefix} ${entry.message}`;
      
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(logMessage);
          break;
        case LogLevel.INFO:
          console.info(logMessage);
          break;
        case LogLevel.WARN:
          console.warn(logMessage);
          break;
        case LogLevel.ERROR:
          console.error(logMessage);
          break;
      }
    }
  }
  
  debug(category: string, message: string, data?: Record<string, unknown>, userId?: string, requestId?: string): void {
    this.log(this.createLogEntry(LogLevel.DEBUG, category, message, data, userId, requestId));
  }
  
  info(category: string, message: string, data?: Record<string, unknown>, userId?: string, requestId?: string): void {
    this.log(this.createLogEntry(LogLevel.INFO, category, message, data, userId, requestId));
  }
  
  warn(category: string, message: string, data?: Record<string, unknown>, userId?: string, requestId?: string): void {
    this.log(this.createLogEntry(LogLevel.WARN, category, message, data, userId, requestId));
  }
  
  error(category: string, message: string, error?: unknown, userId?: string, requestId?: string): void {
    const errorData = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      : error as Record<string, unknown>;
    
    this.log(this.createLogEntry(LogLevel.ERROR, category, message, errorData, userId, requestId));
  }
  
  getLogs(level?: LogLevel, category?: string, limit?: number): LogEntry[] {
    let filteredLogs = [...this.logs];
    
    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }
    
    if (category !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }
    
    if (limit !== undefined) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs;
  }
  
  clearLogs(): void {
    this.logs = [];
  }
  
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }
}

// Create a default logger instance
const logger = new Logger(
  process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
);

// Export the logger instance
export { logger };