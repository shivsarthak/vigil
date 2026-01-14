import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProcessList } from '@/components/ProcessList';
import { Controls } from '@/components/Controls';
import { Timeline } from '@/components/Timeline';
import { SessionList } from '@/components/SessionList';
import { useWebSocket } from '@/hooks/useWebSocket';
import { formatBytes, formatCpu } from '@/lib/utils';
import { Activity, Cpu, HardDrive, AlertCircle, X, TrendingUp, TrendingDown } from 'lucide-react';
import type { ProcessInfo, DataPoint, SessionWithData } from '@/types';
import { cn } from '@/lib/utils';

function App() {
  const {
    isConnected,
    startMonitoring,
    stopMonitoring,
    currentSession,
    dataPoints,
    isRecording,
    error,
    clearError,
  } = useWebSocket();

  const [selectedProcess, setSelectedProcess] = useState<ProcessInfo | null>(null);
  const [displayedDataPoints, setDisplayedDataPoints] = useState<DataPoint[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (isRecording) {
      setDisplayedDataPoints(dataPoints);
    }
  }, [dataPoints, isRecording]);

  useEffect(() => {
    if (!isRecording && currentSession) {
      setRefreshTrigger(prev => prev + 1);
    }
  }, [isRecording, currentSession]);

  const handleSelectSession = (session: SessionWithData) => {
    setDisplayedDataPoints(session.dataPoints);
  };

  const latestDataPoint = displayedDataPoints[displayedDataPoints.length - 1];
  const prevDataPoint = displayedDataPoints[displayedDataPoints.length - 2];

  const getCpuTrend = () => {
    if (!latestDataPoint || !prevDataPoint) return null;
    return latestDataPoint.cpu > prevDataPoint.cpu ? 'up' : latestDataPoint.cpu < prevDataPoint.cpu ? 'down' : null;
  };

  const getMemTrend = () => {
    if (!latestDataPoint || !prevDataPoint) return null;
    return latestDataPoint.memory > prevDataPoint.memory ? 'up' : latestDataPoint.memory < prevDataPoint.memory ? 'down' : null;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Process Monitor</h1>
              <p className="text-xs text-muted-foreground">
                Real-time CPU & Memory monitoring
              </p>
            </div>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-xs font-medium text-red-400">Recording</span>
            </div>
          )}
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/10 border-b border-destructive/20">
          <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive flex-1">{error}</span>
            <button
              onClick={clearError}
              className="p-1 hover:bg-destructive/20 rounded transition-colors"
            >
              <X className="h-4 w-4 text-destructive" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            {/* Process Selection */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-secondary/30">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Select Process
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ProcessList
                  selectedPid={selectedProcess?.pid ?? null}
                  onSelectProcess={setSelectedProcess}
                  disabled={isRecording}
                />
              </CardContent>
            </Card>

            {/* Recording Controls */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-secondary/30">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Recording
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Controls
                  selectedProcess={selectedProcess}
                  isRecording={isRecording}
                  isConnected={isConnected}
                  onStart={startMonitoring}
                  onStop={stopMonitoring}
                />
              </CardContent>
            </Card>

            {/* Session History */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-secondary/30">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Session History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <SessionList
                  currentSessionId={currentSession?.id ?? null}
                  onSelectSession={handleSelectSession}
                  refreshTrigger={refreshTrigger}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main Area */}
          <div className="lg:col-span-9 space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Current CPU */}
              <Card className="bg-gradient-to-br from-chart-1/5 to-transparent border-chart-1/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current CPU</p>
                      <p className="text-2xl font-bold text-chart-1">
                        {latestDataPoint ? formatCpu(latestDataPoint.cpu) : '-'}
                      </p>
                    </div>
                    <div className={cn(
                      "p-2 rounded-lg",
                      getCpuTrend() === 'up' ? "bg-red-500/10" : getCpuTrend() === 'down' ? "bg-green-500/10" : "bg-chart-1/10"
                    )}>
                      {getCpuTrend() === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-red-400" />
                      ) : getCpuTrend() === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-green-400" />
                      ) : (
                        <Cpu className="h-4 w-4 text-chart-1" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Memory */}
              <Card className="bg-gradient-to-br from-chart-2/5 to-transparent border-chart-2/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Current Memory</p>
                      <p className="text-2xl font-bold text-chart-2">
                        {latestDataPoint ? formatBytes(latestDataPoint.memory) : '-'}
                      </p>
                    </div>
                    <div className={cn(
                      "p-2 rounded-lg",
                      getMemTrend() === 'up' ? "bg-red-500/10" : getMemTrend() === 'down' ? "bg-green-500/10" : "bg-chart-2/10"
                    )}>
                      {getMemTrend() === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-red-400" />
                      ) : getMemTrend() === 'down' ? (
                        <TrendingDown className="h-4 w-4 text-green-400" />
                      ) : (
                        <HardDrive className="h-4 w-4 text-chart-2" />
                      )}
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
                        {displayedDataPoints.length > 0
                          ? formatCpu(Math.max(...displayedDataPoints.map(d => d.cpu)))
                          : '-'}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-chart-3/10">
                      <Cpu className="h-4 w-4 text-chart-3" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Peak Memory */}
              <Card className="bg-gradient-to-br from-chart-4/5 to-transparent border-chart-4/20">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Peak Memory</p>
                      <p className="text-2xl font-bold text-chart-4">
                        {displayedDataPoints.length > 0
                          ? formatBytes(Math.max(...displayedDataPoints.map(d => d.memory)))
                          : '-'}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-chart-4/10">
                      <HardDrive className="h-4 w-4 text-chart-4" />
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
                  {displayedDataPoints.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {displayedDataPoints.length} data points
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <Timeline dataPoints={displayedDataPoints} isRecording={isRecording} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
