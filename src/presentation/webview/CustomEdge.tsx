import React, { useState } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import '../../styles/custom-edge.css';

interface CustomEdgeData {
  type?: 'data-flow' | 'dependency' | 'execution';
  label?: string;
  onDelete?: (edgeId: string) => void;
}

const CustomEdge: React.FC<EdgeProps<CustomEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data?.onDelete) {
      data.onDelete(id);
    }
  };

  const getEdgeColor = (type?: string) => {
    switch (type) {
      case 'data-flow': return 'var(--vscode-charts-blue)';
      case 'dependency': return 'var(--vscode-focusBorder)';
      case 'execution': return 'var(--vscode-charts-orange)';
      default: return 'var(--vscode-panel-border)';
    }
  };

  const getEdgeStyle = (type?: string) => {
    const baseStyle = {
      stroke: getEdgeColor(type),
      strokeWidth: 2,
      fill: 'none',
    };

    switch (type) {
      case 'data-flow':
        return { ...baseStyle, strokeDasharray: '5,5' };
      case 'execution':
        return { ...baseStyle, strokeWidth: 3 };
      default:
        return baseStyle;
    }
  };

  return (
    <>
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        style={{ stroke: 'transparent', strokeWidth: 20, fill: 'none' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <path
        id={id}
        style={{ ...getEdgeStyle(data?.type), ...style }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {data?.label && (
        <text>
          <textPath
            href={`#${id}`}
            style={{ fontSize: 12, fill: 'var(--vscode-editor-foreground)' }}
            startOffset="50%"
            textAnchor="middle"
          >
            {data.label}
          </textPath>
        </text>
      )}
      {/* Delete button - appears on hover */}
      {isHovered && data?.onDelete && (
        <EdgeLabelRenderer>
          <div
            className="custom-edge__delete-btn"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <button
              className="custom-edge__delete-btn-inner"
              onClick={handleDelete}
              title="Remove dependency"
            >
              ×
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge;
