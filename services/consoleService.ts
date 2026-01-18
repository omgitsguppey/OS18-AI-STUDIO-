
export interface LogEntry {
  type: 'log' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

class ConsoleService {
  logs: LogEntry[] = [];
  listeners: ((logs: LogEntry[]) => void)[] = [];
  private isInitialized = false;

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      this.addLog('log', args);
      originalLog.apply(console, args);
    };
    console.warn = (...args) => {
      this.addLog('warn', args);
      originalWarn.apply(console, args);
    };
    console.error = (...args) => {
      this.addLog('error', args);
      originalError.apply(console, args);
    };
  }

  private addLog(type: 'log' | 'warn' | 'error', args: any[]) {
    try {
        const message = args.map(a => {
            if (typeof a === 'object') {
                try { return JSON.stringify(a); } catch(e) { return '[Circular/Object]'; }
            }
            return String(a);
        }).join(' ');
        
        const entry = { type, message, timestamp: Date.now() };
        this.logs.push(entry);
        if (this.logs.length > 500) this.logs.shift(); // Memory protection
        this.notify();
    } catch (e) {
        // Prevent infinite loop if logging fails
    }
  }

  subscribe(cb: (logs: LogEntry[]) => void) {
    this.listeners.push(cb);
    cb(this.logs);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb(this.logs));
  }
  
  clear() {
      this.logs = [];
      this.notify();
  }
}

export const consoleService = new ConsoleService();
// Auto-init on import to catch early errors
consoleService.init();
