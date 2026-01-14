import React, { useState, useMemo } from 'react';
import { Node, FolderNode } from '../../shared/types';
import { getWorkflowFolderName } from '../../shared/utils/stringUtils';

interface DependencyPickerModalProps {
    show: boolean;
    currentNodeId: string;
    allNodes: Node[];
    existingDependencies: string[];
    onConfirm: (selectedNodeIds: string[]) => void;
    onCancel: () => void;
}

/**
 * Sprint 9: Global Dependency Picker
 * A searchable modal to select dependencies from any folder
 */
export const DependencyPickerModal: React.FC<DependencyPickerModalProps> = ({
    show,
    currentNodeId,
    allNodes,
    existingDependencies,
    onConfirm,
    onCancel
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Reset selection when modal opens
    React.useEffect(() => {
        if (show) {
            setSelectedIds(new Set());
            setSearchTerm('');
        }
    }, [show]);

    // Filter and flatten nodes
    const filteredNodes = useMemo(() => {
        if (!searchTerm && selectedIds.size === 0) {return [];} // Show nothing initially or maybe recent?

        const term = searchTerm.toLowerCase();
        return allNodes.filter(node => {
            // Exclude current node
            if (node.id === currentNodeId) {return false;}
            
            // Exclude folders (we only depend on functional nodes)
            if (node.nodeType === 'folder') {return false;}

            // Exclude already added dependencies
            if (existingDependencies.includes(node.id)) {return false;}

            // Search match
            const matchesSearch = 
                node.title.toLowerCase().includes(term) || 
                (node.description && node.description.toLowerCase().includes(term));

            return matchesSearch;
        });
    }, [allNodes, currentNodeId, existingDependencies, searchTerm]);

    // Find folder name for a node (helper)
    const getFolderPath = (node: Node): string => {
        if (!node.workflowId) {return 'Unknown';}
        // Assuming workflowId maps to folder structure or we can find parent
        // For MVP, just showing workflowId/folderName is good enough
        return getWorkflowFolderName(node.workflowId);
    };

    const toggleSelection = (nodeId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    };

    if (!show) {return null;}

    return (
        <div className="tdad-modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="tdad-modal" style={{
                width: '600px',
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-input-border)',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '80vh'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--vscode-input-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h3 style={{ margin: 0, fontSize: '16px' }}>Add Dependency</h3>
                    <button 
                        onClick={onCancel}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--vscode-foreground)',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >✕</button>
                </div>

                {/* Search */}
                <div style={{ padding: '16px' }}>
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search for a node (e.g. 'Login')..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            backgroundColor: 'var(--vscode-input-background)',
                            color: 'var(--vscode-input-foreground)',
                            border: '1px solid var(--vscode-input-border)',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    />
                </div>

                {/* List */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0 16px 16px 16px',
                    minHeight: '200px'
                }}>
                    {filteredNodes.length === 0 ? (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '20px', 
                            color: 'var(--vscode-descriptionForeground)' 
                        }}>
                            {searchTerm ? 'No nodes found.' : 'Type to search...'}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {filteredNodes.map(node => {
                                const isSelected = selectedIds.has(node.id);
                                return (
                                    <div
                                        key={node.id}
                                        onClick={() => toggleSelection(node.id)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent',
                                            color: isSelected ? 'var(--vscode-list-activeSelectionForeground)' : 'var(--vscode-foreground)',
                                            border: isSelected ? '1px solid var(--vscode-focusBorder)' : '1px solid transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px'
                                        }}
                                    >
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            readOnly
                                            style={{ pointerEvents: 'none' }} 
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{node.title}</div>
                                            <div style={{ fontSize: '11px', opacity: 0.7 }}>
                                                📁 {getFolderPath(node)}
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            borderRadius: '3px',
                                            backgroundColor: 'var(--vscode-badge-background)',
                                            color: 'var(--vscode-badge-foreground)'
                                        }}>
                                            {node.nodeType}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px',
                    borderTop: '1px solid var(--vscode-input-border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '8px'
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--vscode-button-secondaryBackground)',
                            color: 'var(--vscode-button-secondaryForeground)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(Array.from(selectedIds))}
                        disabled={selectedIds.size === 0}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--vscode-button-background)',
                            color: 'var(--vscode-button-foreground)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                            opacity: selectedIds.size === 0 ? 0.5 : 1
                        }}
                    >
                        Add {selectedIds.size} Dependencies
                    </button>
                </div>
            </div>
        </div>
    );
};

