import pidusage from 'pidusage';
import { EventEmitter } from 'events';
import type { DataPoint, ProcessInfo } from './types.js';
import { getProcessByPid } from './processScanner.js';

interface MonitorEvents {
  data: (dataPoint: DataPoint) => void;
  error: (error: Error) => void;
  stopped: () => void;
}

export class ProcessMonitor extends EventEmitter {
  private pid: number;
  private interval: number;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(pid: number, interval = 500) {
    super();
    this.pid = pid;
    this.interval = interval;
  }

  override on<K extends keyof MonitorEvents>(
    event: K,
    listener: MonitorEvents[K]
  ): this {
    return super.on(event, listener);
  }

  override emit<K extends keyof MonitorEvents>(
    event: K,
    ...args: Parameters<MonitorEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }

  async start(): Promise<ProcessInfo | null> {
    if (this.isRunning) {
      return null;
    }

    const processInfo = await getProcessByPid(this.pid);
    if (!processInfo) {
      throw new Error(`Process with PID ${this.pid} not found`);
    }

    this.isRunning = true;
    this.poll();
    return processInfo;
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    this.emit('stopped');
  }

  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const stats = await pidusage(this.pid);

      const dataPoint: DataPoint = {
        timestamp: Date.now(),
        cpu: stats.cpu,
        memory: stats.memory,
        ppid: stats.ppid,
      };

      this.emit('data', dataPoint);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('No matching pid found') ||
            error.message.includes('No such process')) {
          this.stop();
          this.emit('error', new Error('Process terminated'));
          return;
        }
        this.emit('error', error);
      }
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => this.poll(), this.interval);
    }
  }

  get running(): boolean {
    return this.isRunning;
  }
}
