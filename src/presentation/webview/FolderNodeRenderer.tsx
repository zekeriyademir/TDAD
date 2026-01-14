import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { FolderNode } from '../../shared/types';
import '../../styles/folder-node.css';

interface FolderNodeData {
    node: FolderNode;
    onNavigateInto: (nodeId: string) => void;
    onDelete: (nodeId: string) => void;
}

const FolderNodeRenderer: React.FC<NodeProps<FolderNodeData>> = ({ data, selected }) => {
    const { node, onNavigateInto, onDelete } = data;
    const [isHovered, setIsHovered] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDoubleClick = () => {
        onNavigateInto(node.id);
    };

    const handleOpenClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onNavigateInto(node.id);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(node.id);
        setShowDeleteConfirm(false);
    };

    const handleCancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDeleteConfirm(false);
    };

    const childCount = node.children?.length || 0;
    const showFloatingButtons = isHovered || selected;

    return (
        <div
            className={`folder-node ${selected ? 'folder-node--selected' : 'folder-node--unselected'}`}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title="Double-click to open"
        >
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />

            {/* Floating Action Buttons - consistent with TDADNode */}
            {showFloatingButtons && (
                <div className="folder-node__floating-buttons">
                    <button
                        className="folder-node__floating-btn"
                        onClick={handleOpenClick}
                        title="Open Folder"
                    >
                        📂
                    </button>
                    <button
                        className="folder-node__floating-btn folder-node__floating-btn--delete"
                        onClick={handleDeleteClick}
                        title="Delete Folder"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* Type badge - similar to status badge in TDADNode */}
            <div className="folder-node__type-badge">
                <span className="folder-node__type-badge-icon">📁</span>
                Folder
            </div>

            {/* Item count badge - top right corner */}
            <div className="folder-node__child-count">
                {childCount} {childCount === 1 ? 'item' : 'items'}
            </div>

            <div className="folder-node__content">
                <div className="folder-node__title">{node.title}</div>

                {selected && node.description && (
                    <div className="folder-node__description">
                        {node.description}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="folder-node__delete-confirm-overlay" onClick={handleCancelDelete}>
                    <div className="folder-node__delete-confirm" onClick={e => e.stopPropagation()}>
                        <div className="folder-node__delete-confirm-title">
                            Delete "{node.title}"?
                        </div>
                        <div className="folder-node__delete-confirm-message">
                            This will delete the folder and all its contents.
                        </div>
                        <div className="folder-node__delete-confirm-buttons">
                            <button
                                className="folder-node__delete-confirm-btn folder-node__delete-confirm-btn--cancel"
                                onClick={handleCancelDelete}
                            >
                                Cancel
                            </button>
                            <button
                                className="folder-node__delete-confirm-btn folder-node__delete-confirm-btn--delete"
                                onClick={handleConfirmDelete}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FolderNodeRenderer;
