import React from 'react';
import { projectCameraAxes } from '../camera-axes.js';

export default function CameraAxes({ orientation }) {
  const axes = projectCameraAxes(orientation ? orientation.split(',').map(Number) : undefined);
  return <svg className="axis-indicator" viewBox="0 0 80 80" role="img" aria-label="Направления осей X, Y, Z относительно камеры">
    {axes.map(axis => {
      const x = 40 + axis.x * 24, y = 40 + axis.y * 24;
      const length = Math.hypot(axis.x, axis.y);
      return <g key={axis.label} data-axis={axis.label} opacity={axis.depth < 0 ? .55 : 1}>
        <line x1="40" y1="40" x2={x} y2={y} stroke={axis.color} strokeWidth="1.5"/>
        <circle cx={x} cy={y} r="2" fill={axis.color}/>
        <text x={x + (length > .15 ? axis.x / length * 9 : 8)} y={y + (length > .15 ? axis.y / length * 9 : -7)} fill={axis.color} textAnchor="middle" dominantBaseline="central">{axis.label}</text>
      </g>;
    })}
    <circle cx="40" cy="40" r="2" fill="currentColor"/>
  </svg>;
}
