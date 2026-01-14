import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Square, Wifi, WifiOff, Radio, Terminal } from 'lucide-react';
import type { ProcessInfo } from '@/types';
import { cn } from '@/lib/utils';

interface ControlsProps {
  selectedProcess: ProcessInfo | null;
  isRecording: boolean;
  isConnected: boolean;
  onStart: (pid: number, name?: string) => void;
  onStop: (pid: number) => void;
}

export function Controls({
  selectedProcess,
  isRecording,
  isConnected,
  onStart,
  onStop,
}: ControlsProps) {
  const [sessionName, setSessionName] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      setRecordingTime(0);
      interval = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStart = () => {
    if (selectedProcess) {
      onStart(selectedProcess.pid, sessionName || undefined);
      setSessionName('');
    }
  };

  const handleStop = () => {
    if (selectedProcess) {
      onStop(selectedProcess.pid);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-5">
      {/* Connection Status */}
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg",
        isConnected ? "bg-green-500/10" : "bg-red-500/10"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          isConnected ? "bg-green-500/20" : "bg-red-500/20"
        )}>
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-400" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-400" />
          )}
        </div>
        <div>
          <p className={cn(
            "font-medium text-sm",
            isConnected ? "text-green-400" : "text-red-400"
          )}>
            {isConnected ? 'Server Connected' : 'Disconnected'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isConnected ? 'Ready to monitor' : 'Attempting to reconnect...'}
          </p>
        </div>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="relative overflow-hidden rounded-lg bg-red-500/10 p-4">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent animate-pulse" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Radio className="h-6 w-6 text-red-400" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              </div>
              <div>
                <p className="font-semibold text-red-400">Recording</p>
                <p className="text-xs text-muted-foreground">
                  {selectedProcess?.name} (PID: {selectedProcess?.pid})
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl font-bold text-red-400">
                {formatTime(recordingTime)}
              </p>
              <p className="text-xs text-muted-foreground">elapsed</p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Process Info */}
      {selectedProcess && !isRecording && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Terminal className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedProcess.name}</p>
              <p className="text-xs text-muted-foreground">PID: {selectedProcess.pid}</p>
            </div>
          </div>

          <Input
            placeholder="Session name (optional)"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            className="bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>
      )}

      {/* No Process Selected */}
      {!selectedProcess && !isRecording && (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <Terminal className="h-10 w-10 mb-2 opacity-30" />
          <p className="text-sm">No process selected</p>
          <p className="text-xs mt-1">Select a process above to start monitoring</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={handleStart}
          disabled={!selectedProcess || isRecording || !isConnected}
          className={cn(
            "h-12 text-base font-medium transition-all",
            !isRecording && selectedProcess && isConnected && "bg-green-600 hover:bg-green-700"
          )}
        >
          <Play className="h-5 w-5 mr-2" />
          Start
        </Button>
        <Button
          variant="destructive"
          onClick={handleStop}
          disabled={!isRecording}
          className={cn(
            "h-12 text-base font-medium transition-all",
            isRecording && "animate-pulse"
          )}
        >
          <Square className="h-5 w-5 mr-2" />
          Stop
        </Button>
      </div>
    </div>
  );
}
