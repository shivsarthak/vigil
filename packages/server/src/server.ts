import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { getProcessList, getAllProcesses, getProcessByPid } from './processScanner.js';
import { ProcessMonitor } from './monitor.js';
import {
  initDatabase,
  createSession,
  addDataPoint,
  endSession,
  getSession,
  getSessionWithData,
  getAllSessions,
  deleteSession,
  updateSessionName,
} from './sessionManager.js';
import type { WSMessage, DataPoint } from './types.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

initDatabase();

const activeMonitors = new Map<string, { monitor: ProcessMonitor; sessionId: string }>();

app.get('/api/processes', async (req, res) => {
  try {
    const filter = req.query.filter as string | undefined;
    const all = req.query.all === 'true';
    const processes = all ? await getAllProcesses(filter) : await getProcessList(filter);
    res.json(processes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get processes' });
  }
});

app.get('/api/processes/:pid', async (req, res) => {
  try {
    const pid = parseInt(req.params.pid, 10);
    const process = await getProcessByPid(pid);
    if (!process) {
      res.status(404).json({ error: 'Process not found' });
      return;
    }
    res.json(process);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get process' });
  }
});

app.get('/api/sessions', (_req, res) => {
  try {
    const sessions = getAllSessions();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

app.get('/api/sessions/:id', (req, res) => {
  try {
    const session = getSessionWithData(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session' });
  }
});

app.patch('/api/sessions/:id', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const session = updateSessionName(req.params.id, name);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update session' });
  }
});

app.delete('/api/sessions/:id', (req, res) => {
  try {
    const deleted = deleteSession(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

function broadcast(message: WSMessage): void {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString()) as {
        type: string;
        payload: Record<string, unknown>;
      };

      switch (message.type) {
        case 'start': {
          const { pid, name } = message.payload as { pid: number; name?: string };

          if (activeMonitors.has(String(pid))) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Monitor already running for this process' },
            }));
            return;
          }

          const processInfo = await getProcessByPid(pid);
          if (!processInfo) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Process not found' },
            }));
            return;
          }

          const sessionName = name || `${processInfo.name} - ${new Date().toLocaleString()}`;
          const session = createSession(
            sessionName,
            pid,
            processInfo.name,
            processInfo.cmd
          );

          const monitor = new ProcessMonitor(pid, 500);

          monitor.on('data', (dataPoint: DataPoint) => {
            addDataPoint(
              session.id,
              dataPoint.timestamp,
              dataPoint.cpu,
              dataPoint.memory,
              dataPoint.ppid
            );

            broadcast({
              type: 'datapoint',
              payload: {
                sessionId: session.id,
                ...dataPoint,
              },
            });
          });

          monitor.on('error', (error: Error) => {
            broadcast({
              type: 'error',
              payload: { message: error.message, sessionId: session.id },
            });
          });

          monitor.on('stopped', () => {
            activeMonitors.delete(String(pid));
          });

          await monitor.start();
          activeMonitors.set(String(pid), { monitor, sessionId: session.id });

          broadcast({
            type: 'started',
            payload: { session, processInfo },
          });
          break;
        }

        case 'stop': {
          const { pid } = message.payload as { pid: number };
          const entry = activeMonitors.get(String(pid));

          if (entry) {
            entry.monitor.stop();
            const session = endSession(entry.sessionId);
            activeMonitors.delete(String(pid));

            broadcast({
              type: 'stopped',
              payload: { session },
            });
          }
          break;
        }

        case 'getProcesses': {
          const { filter, all } = message.payload as { filter?: string; all?: boolean };
          const processes = all ? await getAllProcesses(filter) : await getProcessList(filter);
          ws.send(JSON.stringify({
            type: 'processes',
            payload: processes,
          }));
          break;
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Invalid message format' },
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket available on ws://localhost:${PORT}`);
});
