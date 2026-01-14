export interface ProcessInfo {
  pid: number;
  name: string;
  cmd: string;
  cpu?: number;
  memory?: number;
}

export interface DataPoint {
  timestamp: number;
  cpu: number;
  memory: number;
  ppid?: number;
}

export interface Session {
  id: string;
  name: string;
  pid: number;
  processName: string;
  command: string;
  startTime: number;
  endTime: number | null;
  avgCpu: number | null;
  maxCpu: number | null;
  avgMemory: number | null;
  maxMemory: number | null;
}

export interface SessionWithData extends Session {
  dataPoints: DataPoint[];
}

export interface WSMessage {
  type: 'datapoint' | 'error' | 'started' | 'stopped' | 'processes';
  payload: Record<string, unknown>;
}
