import psList from 'ps-list';
import type { ProcessInfo } from './types.js';

const RELEVANT_PROCESS_NAMES = ['node', 'python', 'python3', 'ffmpeg', 'java', 'ruby', 'php', 'go', 'rust'];

export async function getProcessList(filter?: string): Promise<ProcessInfo[]> {
  const processes = await psList();

  let filtered = processes
    .filter(p => {
      const name = p.name.toLowerCase();
      return RELEVANT_PROCESS_NAMES.some(relevant => name.includes(relevant));
    })
    .map(p => ({
      pid: p.pid,
      name: p.name,
      cmd: p.cmd || p.name,
      cpu: p.cpu,
      memory: p.memory,
    }));

  if (filter) {
    const searchTerm = filter.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(searchTerm) ||
      p.cmd.toLowerCase().includes(searchTerm)
    );
  }

  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllProcesses(filter?: string): Promise<ProcessInfo[]> {
  const processes = await psList();

  let mapped = processes.map(p => ({
    pid: p.pid,
    name: p.name,
    cmd: p.cmd || p.name,
    cpu: p.cpu,
    memory: p.memory,
  }));

  if (filter) {
    const searchTerm = filter.toLowerCase();
    mapped = mapped.filter(p =>
      p.name.toLowerCase().includes(searchTerm) ||
      p.cmd.toLowerCase().includes(searchTerm)
    );
  }

  return mapped.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProcessByPid(pid: number): Promise<ProcessInfo | null> {
  const processes = await psList();
  const process = processes.find(p => p.pid === pid);

  if (!process) {
    return null;
  }

  return {
    pid: process.pid,
    name: process.name,
    cmd: process.cmd || process.name,
    cpu: process.cpu,
    memory: process.memory,
  };
}
