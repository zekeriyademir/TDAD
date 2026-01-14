import React from 'react';
import '../../styles/breadcrumbs.css';

interface BreadcrumbItem {
    nodeId: string;
    title: string;
    nodeType: 'folder' | 'file' | 'function';
}

interface BreadcrumbsProps {
    path: BreadcrumbItem[];
    onNavigate: (nodeId: string | null) => void;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ path, onNavigate }) => {
    const getIcon = (nodeType: string) => {
        switch (nodeType) {
            case 'folder': return '📁';
            case 'file': return '📄';
            case 'function': return '⚙️';
            default: return '📦';
        }
    };

    if (path.length === 0) {
        return (
            <div className="breadcrumbs">
                <button
                    className="breadcrumbs__home-button"
                    onClick={() => onNavigate(null)}
                >
                    🏠 Root
                </button>
            </div>
        );
    }

    return (
        <div className="breadcrumbs">
            <button
                className="breadcrumbs__home-button"
                onClick={() => onNavigate(null)}
                title="Go to root"
            >
                🏠
            </button>

            {path.map((crumb, index) => {
                const isLast = index === path.length - 1;

                return (
                    <React.Fragment key={crumb.nodeId}>
                        <span className="breadcrumbs__separator">›</span>

                        {isLast ? (
                            <div className="breadcrumbs__crumb--current" title={crumb.title}>
                                <span>{getIcon(crumb.nodeType)}</span>
                                <span>{crumb.title}</span>
                            </div>
                        ) : (
                            <button
                                className="breadcrumbs__crumb-button"
                                onClick={() => onNavigate(crumb.nodeId)}
                                title={`Navigate to ${crumb.title}`}
                            >
                                <span>{getIcon(crumb.nodeType)}</span>
                                <span>{crumb.title}</span>
                            </button>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default Breadcrumbs;
