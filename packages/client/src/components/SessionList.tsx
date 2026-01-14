import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Clock, Cpu, HardDrive, Radio, Calendar, ChevronRight, History } from 'lucide-react';
import type { Session, SessionWithData } from '@/types';
import { formatBytes, formatCpu, formatDuration, cn } from '@/lib/utils';

interface SessionListProps {
  currentSessionId: string | null;
  onSelectSession: (session: SessionWithData) => void;
  refreshTrigger: number;
}

export function SessionList({ currentSessionId, onSelectSession, refreshTrigger }: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [refreshTrigger]);

  const handleSelectSession = async (sessionId: string) => {
    setSelectedId(sessionId);
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      const data: SessionWithData = await response.json();
      onSelectSession(data);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedId === sessionId) {
        setSelectedId(null);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  if (sessions.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
          <History className="h-8 w-8 opacity-50" />
        </div>
        <p className="font-medium">No sessions yet</p>
        <p className="text-sm mt-1 text-center">
          Start recording to create<br />your first session
        </p>
      </div>
    );
  }

  // Group sessions by date
  const groupedSessions = sessions.reduce((groups, session) => {
    const date = new Date(session.startTime).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(session);
    return groups;
  }, {} as Record<string, Session[]>);

  return (
    <ScrollArea className="h-[calc(100vh-220px)]">
      <div className="space-y-6 pr-2">
        {Object.entries(groupedSessions).map(([date, dateSessions]) => (
          <div key={date}>
            {/* Date Header */}
            <div className="flex items-center gap-2 mb-3 sticky top-0 bg-card py-1 z-10">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {date === new Date().toLocaleDateString() ? 'Today' : date}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Sessions */}
            <div className="space-y-2 relative">
              {/* Timeline Line */}
              <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />

              {dateSessions.map((session) => {
                const duration = session.endTime
                  ? session.endTime - session.startTime
                  : Date.now() - session.startTime;
                const isActive = currentSessionId === session.id || selectedId === session.id;
                const isCompleted = session.endTime !== null;

                return (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={cn(
                      "w-full text-left p-3 pl-12 rounded-lg transition-all relative group",
                      "hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                      isActive && "bg-primary/10 ring-1 ring-primary/30"
                    )}
                  >
                    {/* Timeline Dot */}
                    <div className={cn(
                      "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 z-10",
                      isCompleted
                        ? "bg-card border-muted-foreground"
                        : "bg-red-500 border-red-500 animate-pulse"
                    )}>
                      {!isCompleted && (
                        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate text-sm">
                            {session.name}
                          </span>
                          {!isCompleted && (
                            <span className="flex items-center gap-1 text-[10px] text-red-400 font-medium">
                              <Radio className="h-3 w-3" />
                              LIVE
                            </span>
                          )}
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono">{session.processName}</span>
                          <span>PID {session.pid}</span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">{formatDuration(duration)}</span>
                          </div>
                          {session.maxCpu !== null && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <Cpu className="h-3.5 w-3.5 text-chart-1" />
                              <span className="font-medium">{formatCpu(session.maxCpu)}</span>
                            </div>
                          )}
                          {session.maxMemory !== null && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <HardDrive className="h-3.5 w-3.5 text-chart-2" />
                              <span className="font-medium">{formatBytes(session.maxMemory)}</span>
                            </div>
                          )}
                        </div>

                        {/* Time */}
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {new Date(session.startTime).toLocaleTimeString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isCompleted && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleDeleteSession(session.id, e)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                        <ChevronRight className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isActive && "text-primary rotate-90"
                        )} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
