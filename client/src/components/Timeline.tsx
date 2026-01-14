import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { DataPoint } from '@/types';
import { formatBytes, formatCpu } from '@/lib/utils';

interface TimelineProps {
  dataPoints: DataPoint[];
  isRecording: boolean;
}

export function Timeline({ dataPoints, isRecording }: TimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    data: DataPoint | null;
  }>({ visible: false, x: 0, y: 0, data: null });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(400, width), height: 350 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || dataPoints.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 60, bottom: 40, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const timeExtent = d3.extent(dataPoints, d => d.timestamp) as [number, number];
    const xScale = d3.scaleTime()
      .domain(timeExtent)
      .range([0, width]);

    const cpuMax = Math.max(100, d3.max(dataPoints, d => d.cpu) || 100);
    const yCpuScale = d3.scaleLinear()
      .domain([0, cpuMax])
      .range([height, 0]);

    const memMax = d3.max(dataPoints, d => d.memory) || 1024 * 1024 * 1024;
    const yMemScale = d3.scaleLinear()
      .domain([0, memMax * 1.1])
      .range([height, 0]);

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(6).tickSize(-height).tickFormat(() => ''))
      .selectAll('line')
      .attr('stroke', 'rgba(255,255,255,0.1)');

    g.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yCpuScale).ticks(5).tickSize(-width).tickFormat(() => ''))
      .selectAll('line')
      .attr('stroke', 'rgba(255,255,255,0.1)');

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => {
        const date = d as Date;
        return d3.timeFormat('%H:%M:%S')(date);
      }))
      .selectAll('text')
      .attr('fill', 'rgba(255,255,255,0.7)');

    g.append('g')
      .call(d3.axisLeft(yCpuScale).ticks(5).tickFormat(d => `${d}%`))
      .selectAll('text')
      .attr('fill', 'oklch(0.488 0.243 264.376)');

    g.append('g')
      .attr('transform', `translate(${width},0)`)
      .call(d3.axisRight(yMemScale).ticks(5).tickFormat(d => formatBytes(d as number)))
      .selectAll('text')
      .attr('fill', 'oklch(0.696 0.17 162.48)');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -45)
      .attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', 'oklch(0.488 0.243 264.376)')
      .attr('font-size', '12px')
      .text('CPU %');

    g.append('text')
      .attr('transform', 'rotate(90)')
      .attr('y', -width - 45)
      .attr('x', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', 'oklch(0.696 0.17 162.48)')
      .attr('font-size', '12px')
      .text('Memory');

    const cpuLine = d3.line<DataPoint>()
      .x(d => xScale(d.timestamp))
      .y(d => yCpuScale(d.cpu))
      .curve(d3.curveMonotoneX);

    const memLine = d3.line<DataPoint>()
      .x(d => xScale(d.timestamp))
      .y(d => yMemScale(d.memory))
      .curve(d3.curveMonotoneX);

    const cpuArea = d3.area<DataPoint>()
      .x(d => xScale(d.timestamp))
      .y0(height)
      .y1(d => yCpuScale(d.cpu))
      .curve(d3.curveMonotoneX);

    const memArea = d3.area<DataPoint>()
      .x(d => xScale(d.timestamp))
      .y0(height)
      .y1(d => yMemScale(d.memory))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(dataPoints)
      .attr('fill', 'oklch(0.488 0.243 264.376 / 0.1)')
      .attr('d', cpuArea);

    g.append('path')
      .datum(dataPoints)
      .attr('fill', 'oklch(0.696 0.17 162.48 / 0.1)')
      .attr('d', memArea);

    g.append('path')
      .datum(dataPoints)
      .attr('fill', 'none')
      .attr('stroke', 'oklch(0.488 0.243 264.376)')
      .attr('stroke-width', 2)
      .attr('d', cpuLine);

    g.append('path')
      .datum(dataPoints)
      .attr('fill', 'none')
      .attr('stroke', 'oklch(0.696 0.17 162.48)')
      .attr('stroke-width', 2)
      .attr('d', memLine);

    const bisect = d3.bisector<DataPoint, number>(d => d.timestamp).left;

    const focus = g.append('g').style('display', 'none');

    focus.append('line')
      .attr('class', 'focus-line')
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', 'rgba(255,255,255,0.5)')
      .attr('stroke-dasharray', '3,3');

    focus.append('circle')
      .attr('class', 'cpu-point')
      .attr('r', 5)
      .attr('fill', 'oklch(0.488 0.243 264.376)');

    focus.append('circle')
      .attr('class', 'mem-point')
      .attr('r', 5)
      .attr('fill', 'oklch(0.696 0.17 162.48)');

    svg.append('rect')
      .attr('class', 'overlay')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', () => focus.style('display', null))
      .on('mouseout', () => {
        focus.style('display', 'none');
        setTooltip(prev => ({ ...prev, visible: false }));
      })
      .on('mousemove', function(event) {
        const [mouseX] = d3.pointer(event);
        const x0 = xScale.invert(mouseX);
        const i = bisect(dataPoints, x0.getTime(), 1);
        const d0 = dataPoints[i - 1];
        const d1 = dataPoints[i];

        if (!d0) return;

        const d = d1 && (x0.getTime() - d0.timestamp > d1.timestamp - x0.getTime()) ? d1 : d0;

        const xPos = xScale(d.timestamp);
        focus.select('.focus-line').attr('x1', xPos).attr('x2', xPos);
        focus.select('.cpu-point').attr('cx', xPos).attr('cy', yCpuScale(d.cpu));
        focus.select('.mem-point').attr('cx', xPos).attr('cy', yMemScale(d.memory));

        setTooltip({
          visible: true,
          x: xPos + margin.left,
          y: event.offsetY,
          data: d,
        });
      });

  }, [dataPoints, dimensions]);

  return (
    <div ref={containerRef} className="relative w-full">
      {dataPoints.length === 0 ? (
        <div className="flex items-center justify-center h-[350px] border border-border rounded-lg bg-card">
          <p className="text-muted-foreground">
            {isRecording ? 'Waiting for data...' : 'Select a process and start recording to see metrics'}
          </p>
        </div>
      ) : (
        <>
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="bg-card rounded-lg border border-border"
          />
          {tooltip.visible && tooltip.data && (
            <div
              className="absolute pointer-events-none bg-popover border border-border rounded-md p-2 shadow-lg text-sm z-50"
              style={{
                left: tooltip.x + 10,
                top: tooltip.y - 60,
                transform: tooltip.x > dimensions.width - 150 ? 'translateX(-120%)' : 'none',
              }}
            >
              <p className="text-muted-foreground text-xs">
                {new Date(tooltip.data.timestamp).toLocaleTimeString()}
              </p>
              <p style={{ color: 'oklch(0.488 0.243 264.376)' }}>
                CPU: {formatCpu(tooltip.data.cpu)}
              </p>
              <p style={{ color: 'oklch(0.696 0.17 162.48)' }}>
                Memory: {formatBytes(tooltip.data.memory)}
              </p>
            </div>
          )}
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5" style={{ backgroundColor: 'oklch(0.488 0.243 264.376)' }} />
              <span className="text-sm text-muted-foreground">CPU Usage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5" style={{ backgroundColor: 'oklch(0.696 0.17 162.48)' }} />
              <span className="text-sm text-muted-foreground">Memory (RSS)</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
