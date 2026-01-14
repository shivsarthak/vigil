import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Search, Terminal, Cpu, HardDrive, ChevronRight } from 'lucide-react';
import type { ProcessInfo } from '@/types';
import { cn } from '@/lib/utils';

interface ProcessListProps {
  selectedPid: number | null;
  onSelectProcess: (process: ProcessInfo | null) => void;
  disabled?: boolean;
}

const processIcons: Record<string, string> = {
  node: 'bg-green-500/20 text-green-400',
  python: 'bg-yellow-500/20 text-yellow-400',
  python3: 'bg-yellow-500/20 text-yellow-400',
  ffmpeg: 'bg-purple-500/20 text-purple-400',
  java: 'bg-orange-500/20 text-orange-400',
  ruby: 'bg-red-500/20 text-red-400',
  go: 'bg-cyan-500/20 text-cyan-400',
};

export function ProcessList({ selectedPid, onSelectProcess, disabled }: ProcessListProps) {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [filter, setFilter] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('filter', filter);
      if (showAll) params.set('all', 'true');

      const response = await fetch(`/api/processes?${params}`);
      const data = await response.json();
      setProcesses(data);
    } catch (err) {
      console.error('Failed to fetch processes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, [showAll]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchProcesses();
    }, 300);
    return () => clearTimeout(debounce);
  }, [filter]);

  const getProcessColor = (name: string) => {
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(processIcons)) {
      if (lowerName.includes(key)) return value;
    }
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search processes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
            disabled={disabled}
          />
        </div>
        <Button
          variant="secondary"
          size="icon"
          onClick={fetchProcesses}
          disabled={loading || disabled}
          className="shrink-0"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm cursor-pointer group">
          <div className={cn(
            "w-9 h-5 rounded-full transition-colors relative",
            showAll ? "bg-primary" : "bg-secondary",
            disabled && "opacity-50 cursor-not-allowed"
          )}>
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="sr-only"
              disabled={disabled}
            />
            <div className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
              showAll ? "translate-x-4" : "translate-x-0.5"
            )} />
          </div>
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
            Show all processes
          </span>
        </label>
        <Badge variant="outline" className="text-xs">
          {processes.length} found
        </Badge>
      </div>

      {/* Process List */}
      <ScrollArea className="h-[280px] -mx-2 px-2">
        <div className="space-y-1">
          {processes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Terminal className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No processes found</p>
              <p className="text-xs mt-1">Try adjusting your search</p>
            </div>
          ) : (
            processes.map((process) => {
              const isSelected = selectedPid === process.pid;
              return (
                <button
                  key={process.pid}
                  onClick={() => onSelectProcess(isSelected ? null : process)}
                  disabled={disabled}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all group",
                    "hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-primary/50",
                    isSelected && "bg-primary/10 ring-1 ring-primary/50",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Process Icon */}
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      getProcessColor(process.name)
                    )}>
                      <Terminal className="h-5 w-5" />
                    </div>

                    {/* Process Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{process.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          {process.pid}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {process.cmd}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                      isSelected && "text-primary rotate-90"
                    )} />
                  </div>

                  {/* Quick Stats */}
                  {(process.cpu !== undefined || process.memory !== undefined) && (
                    <div className="flex gap-4 mt-2 ml-13 pl-13">
                      {process.cpu !== undefined && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Cpu className="h-3 w-3" />
                          <span>{process.cpu.toFixed(1)}%</span>
                        </div>
                      )}
                      {process.memory !== undefined && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <HardDrive className="h-3 w-3" />
                          <span>{process.memory.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
