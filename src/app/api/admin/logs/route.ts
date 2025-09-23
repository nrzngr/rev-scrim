import { NextRequest, NextResponse } from 'next/server';
import { logger, LogLevel } from '@/lib/logger';

// GET - Retrieve logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const category = searchParams.get('category');
    const limit = searchParams.get('limit');
    const clear = searchParams.get('clear') === 'true';
    
    // Clear logs if requested
    if (clear) {
      logger.clearLogs();
      return NextResponse.json({ 
        ok: true, 
        message: 'Logs cleared successfully' 
      }, { status: 200 });
    }
    
    // Parse parameters
    let logLevel: LogLevel | undefined;
    if (level) {
      const parsedLevel = parseInt(level);
      if (!isNaN(parsedLevel) && parsedLevel >= 0 && parsedLevel <= 3) {
        logLevel = parsedLevel as LogLevel;
      }
    }
    
    let logLimit: number | undefined;
    if (limit) {
      const parsedLimit = parseInt(limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        logLimit = parsedLimit;
      }
    }
    
    // Get logs
    const logs = logger.getLogs(logLevel, category || undefined, logLimit);
    
    return NextResponse.json({ 
      ok: true, 
      logs,
      count: logs.length,
      parameters: {
        level: logLevel !== undefined ? LogLevel[logLevel] : undefined,
        category,
        limit: logLimit
      }
    }, { status: 200 });
    
  } catch (error) {
    logger.error('LOGS_API', 'Failed to retrieve logs', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a log entry manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { level, category, message, data } = body;
    
    // Validate required fields
    if (level === undefined || category === undefined || message === undefined) {
      return NextResponse.json(
        { ok: false, error: 'Level, category, and message are required' },
        { status: 400 }
      );
    }
    
    // Validate level
    if (level < 0 || level > 3) {
      return NextResponse.json(
        { ok: false, error: 'Level must be between 0 and 3' },
        { status: 400 }
      );
    }
    
    // Add log entry
    switch (level) {
      case LogLevel.DEBUG:
        logger.debug(category, message, data);
        break;
      case LogLevel.INFO:
        logger.info(category, message, data);
        break;
      case LogLevel.WARN:
        logger.warn(category, message, data);
        break;
      case LogLevel.ERROR:
        logger.error(category, message, data);
        break;
    }
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Log entry added successfully' 
    }, { status: 200 });
    
  } catch (error) {
    logger.error('LOGS_API', 'Failed to add log entry', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Clear logs
export async function DELETE() {
  try {
    logger.clearLogs();
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Logs cleared successfully' 
    }, { status: 200 });
    
  } catch (error) {
    logger.error('LOGS_API', 'Failed to clear logs', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}