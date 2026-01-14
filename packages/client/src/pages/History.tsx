import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Timeline } from '@/components/Timeline';
import { useTheme } from '@/context/ThemeContext';
import {
  ArrowLeft,
  Trash2,
  Clock,
  Cpu,
  HardDrive,
  Calendar,
  History as HistoryIcon,
  Activity,
  ChevronRight,
  Radio,
  Sun,
  Moon
} from 'lucide-react';
import type { Session, SessionWithData, DataPoint } from '@/types';
import { formatBytes, formatCpu, formatDuration, cn } from '@/lib/utils';

export function History() {
  const { theme, toggleTheme } = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionWithData | null>(null);
  const [selectedDataPoints, setSelectedDataPoints] = useState<DataPoint[]>([]);

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
  }, []);

  const handleSelectSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      const data: SessionWithData = await response.json();
      setSelectedSession(data);
      setSelectedDataPoints(data.dataPoints);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setSelectedDataPoints([]);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon" className="mr-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <HistoryIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Session History</h1>
              <p className="text-xs text-muted-foreground">
                {sessions.length} recorded session{sessions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sessions List */}
          <div className="lg:col-span-4">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-secondary/30">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  All Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4">
                    <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                      <HistoryIcon className="h-8 w-8 opacity-50" />
                    </div>
                    <p className="font-medium">No sessions yet</p>
                    <p className="text-sm mt-1 text-center">
                      Start recording on the monitor page to create your first session
                    </p>
                    <Link to="/" className="mt-4">
                      <Button variant="outline" size="sm">
                        <Activity className="h-4 w-4 mr-2" />
                        Go to Monitor
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <ScrollArea className="h-[calc(100vh-200px)]">
                    <div className="p-4 space-y-6">
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
                              const isActive = selectedSession?.id === session.id;
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
                )}
              </CardContent>
            </Card>
          </div>

          {/* Session Details */}
          <div className="lg:col-span-8 space-y-4">
            {selectedSession ? (
              <>
                {/* Session Info */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-bold">{selectedSession.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedSession.processName} (PID {selectedSession.pid})
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{new Date(selectedSession.startTime).toLocaleDateString()}</p>
                        <p>{new Date(selectedSession.startTime).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono bg-secondary/50 p-2 rounded truncate">
                      {selectedSession.command}
                    </p>
                  </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Duration */}
                  <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Duration</p>
                          <p className="text-2xl font-bold text-primary">
                            {formatDuration(
                              selectedSession.endTime
                                ? selectedSession.endTime - selectedSession.startTime
                                : Date.now() - selectedSession.startTime
                            )}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Avg CPU */}
                  <Card className="bg-gradient-to-br from-chart-1/5 to-transparent border-chart-1/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Avg CPU</p>
                          <p className="text-2xl font-bold text-chart-1">
                            {selectedSession.avgCpu !== null ? formatCpu(selectedSession.avgCpu) : '-'}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-chart-1/10">
                          <Cpu className="h-4 w-4 text-chart-1" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Peak CPU */}
                  <Card className="bg-gradient-to-br from-chart-3/5 to-transparent border-chart-3/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Peak CPU</p>
                          <p className="text-2xl font-bold text-chart-3">
                            {selectedSession.maxCpu !== null ? formatCpu(selectedSession.maxCpu) : '-'}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-chart-3/10">
                          <Cpu className="h-4 w-4 text-chart-3" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Peak Memory */}
                  <Card className="bg-gradient-to-br from-chart-2/5 to-transparent border-chart-2/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Peak Memory</p>
                          <p className="text-2xl font-bold text-chart-2">
                            {selectedSession.maxMemory !== null ? formatBytes(selectedSession.maxMemory) : '-'}
                          </p>
                        </div>
                        <div className="p-2 rounded-lg bg-chart-2/10">
                          <HardDrive className="h-4 w-4 text-chart-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Timeline Chart */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-2 bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        Resource Timeline
                      </CardTitle>
                      {selectedDataPoints.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {selectedDataPoints.length} data points
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <Timeline dataPoints={selectedDataPoints} isRecording={false} />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="h-[calc(100vh-200px)] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                    <HistoryIcon className="h-10 w-10 opacity-50" />
                  </div>
                  <p className="font-medium text-lg">Select a session</p>
                  <p className="text-sm mt-1">
                    Choose a session from the list to view its details
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
