"use client";

import React, { useState, useMemo } from 'react';
import { Rack } from '../types';

interface WarehouseMapProps {
  racks: Rack[];
  onRackClick: (rack: Rack) => void;
  selectedRackId?: string;
}

export default function WarehouseMap({ racks, onRackClick, selectedRackId }: WarehouseMapProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Group racks by zone
  const racksByZone = useMemo(() => {
    const grouped: Record<string, Rack[]> = {};
    racks.forEach(rack => {
      if (!grouped[rack.zone]) {
        grouped[rack.zone] = [];
      }
      grouped[rack.zone].push(rack);
    });
    return grouped;
  }, [racks]);

  // Calculate map bounds
  const mapBounds = useMemo(() => {
    if (racks.length === 0) return { minX: 0, maxX: 800, minY: 0, maxY: 600 };
    
    const xs = racks.map(r => r.x);
    const ys = racks.map(r => r.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs) + 50,
      minY: Math.min(...ys),
      maxY: Math.max(...ys) + 80
    };
  }, [racks]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)));
  };

  const getRackColor = (rack: Rack) => {
    if (rack.status === 'blocked') return 'bg-red-500';
    if (rack.status === 'maintenance') return 'bg-yellow-500';
    
    // Color based on utilization
    if (rack.utilization >= 80) return 'bg-green-600';
    if (rack.utilization >= 50) return 'bg-blue-500';
    if (rack.utilization >= 25) return 'bg-blue-300';
    return 'bg-gray-300';
  };

  const getRackBorderColor = (rack: Rack) => {
    if (selectedRackId === rack.id) return 'border-4 border-purple-600';
    return 'border-2 border-gray-800';
  };

  return (
    <div className="box">
      <div className="box-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="box-title">Warehouse Map - 2D Visual View</h3>
            <p className="text-sm text-gray-600 mt-1">
              Interactive layout with racks, rows, and baskets. Click on racks to view details.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
              className="ti-btn ti-btn-sm ti-btn-light"
            >
              <i className="ri-zoom-out-line"></i>
            </button>
            <span className="text-sm font-medium min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(prev => Math.min(3, prev + 0.1))}
              className="ti-btn ti-btn-sm ti-btn-light"
            >
              <i className="ri-zoom-in-line"></i>
            </button>
            <button
              onClick={() => {
                setPan({ x: 0, y: 0 });
                setZoom(1);
              }}
              className="ti-btn ti-btn-sm ti-btn-light"
              title="Reset View"
            >
              <i className="ri-refresh-line"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="box-body">
        {/* Legend */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-semibold mb-2">Legend</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span>High Utilization (≥80%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>Medium Utilization (50-79%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-300 rounded"></div>
              <span>Low Utilization (25-49%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span>Empty ({'<'}25%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-500 rounded"></div>
              <span>Maintenance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Blocked</span>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div
          className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100"
          style={{ height: '600px', cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <svg
            width="100%"
            height="100%"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0'
            }}
          >
            {/* Zone Labels */}
            {Object.keys(racksByZone).map(zone => {
              const zoneRacks = racksByZone[zone];
              const avgX = zoneRacks.reduce((sum, r) => sum + r.x, 0) / zoneRacks.length;
              const minY = Math.min(...zoneRacks.map(r => r.y));
              
              return (
                <text
                  key={`zone-${zone}`}
                  x={avgX}
                  y={minY - 10}
                  className="text-2xl font-bold fill-gray-700"
                  textAnchor="middle"
                >
                  Zone {zone}
                </text>
              );
            })}

            {/* Racks */}
            {racks.map(rack => {
              // Calculate dynamic font sizes based on rack dimensions
              const nameFontSize = Math.max(8, Math.min(14, rack.width / 8, rack.height / 3));
              const utilizationFontSize = Math.max(7, Math.min(11, rack.width / 10, rack.height / 5));
              
              // Determine if we have space to show utilization
              const canShowUtil = rack.height >= 25 && rack.width >= 40;
              
              // Calculate text positioning
              const textYOffset = canShowUtil ? -nameFontSize / 3 : 0;
              const utilYOffset = nameFontSize / 2 + utilizationFontSize / 2 + 2;
              
              // Truncate text if it's too long (simple character-based truncation)
              const maxChars = Math.max(2, Math.floor(rack.width / (nameFontSize * 0.6)));
              const displayName = rack.name.length > maxChars 
                ? rack.name.substring(0, maxChars - 1) + '…' 
                : rack.name;
              
              return (
                <g key={rack.id}>
                  <title>{`${rack.name}\nUtilization: ${rack.utilization}%\nStatus: ${rack.status}`}</title>
                  <rect
                    x={rack.x}
                    y={rack.y}
                    width={rack.width}
                    height={rack.height}
                    className={`${getRackColor(rack)} ${getRackBorderColor(rack)} cursor-pointer transition-all hover:opacity-80`}
                    onClick={() => onRackClick(rack)}
                    rx="4"
                  />
                  
                  {/* Clip path to prevent text overflow */}
                  <clipPath id={`clip-${rack.id}`}>
                    <rect
                      x={rack.x + 2}
                      y={rack.y + 2}
                      width={rack.width - 4}
                      height={rack.height - 4}
                      rx="3"
                    />
                  </clipPath>
                  
                  <g clipPath={`url(#clip-${rack.id})`}>
                    {/* Rack Name */}
                    <text
                      x={rack.x + rack.width / 2}
                      y={rack.y + rack.height / 2 + textYOffset}
                      className="font-semibold fill-white pointer-events-none select-none"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={nameFontSize}
                      style={{ userSelect: 'none' }}
                    >
                      {displayName}
                    </text>
                    
                    {/* Utilization Percentage */}
                    {canShowUtil && (
                      <text
                        x={rack.x + rack.width / 2}
                        y={rack.y + rack.height / 2 + utilYOffset}
                        className="fill-white/90 pointer-events-none select-none"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={utilizationFontSize}
                        style={{ userSelect: 'none' }}
                      >
                        {rack.utilization}%
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Instructions Overlay */}
          <div className="absolute top-4 right-4 bg-white/90 p-3 rounded-lg shadow-lg text-xs">
            <div className="font-semibold mb-1">Controls:</div>
            <div>• Scroll to zoom</div>
            <div>• Drag to pan</div>
            <div>• Click rack for details</div>
          </div>
        </div>

        {/* Zone Statistics */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.keys(racksByZone).map(zone => {
            const zoneRacks = racksByZone[zone];
            const avgUtilization = zoneRacks.reduce((sum, r) => sum + r.utilization, 0) / zoneRacks.length;
            const activeRacks = zoneRacks.filter(r => r.status === 'active').length;
            
            return (
              <div key={zone} className="p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold text-sm">Zone {zone}</div>
                <div className="text-xs text-gray-600 mt-1">
                  {zoneRacks.length} racks • {activeRacks} active
                </div>
                <div className="text-xs text-gray-600">
                  Avg Utilization: {Math.round(avgUtilization)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

