/**
 * TestDetailsDialog - Modal dialog for viewing test details and statuses
 *
 * Shows all tests with their statuses (passed/failed/pending)
 * with clickable file path to navigate to test file.
 */

import React from 'react';
import '../../styles/test-details-dialog.css';

interface TestDetail {
    title: string;
    input: string;
    expectedResult: string;
    actualResult?: string;
    status: string;
}

interface TestDetailsDialogProps {
    show: boolean;
    nodeTitle: string;
    testFilePath: string | null;
    testDetails: TestDetail[];
    onClose: () => void;
    onOpenFile: (filePath: string) => void;
}

const TestDetailsDialog: React.FC<TestDetailsDialogProps> = ({
    show,
    nodeTitle,
    testFilePath,
    testDetails,
    onClose,
    onOpenFile
}) => {
    if (!show) {
        return null;
    }

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'passed': return '✅';
            case 'failed': return '❌';
            case 'running': return '⏳';
            case 'skipped': return '⏭️';
            default: return '⏸️';
        }
    };

    const getStatusClass = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'passed': return 'test-details-dialog__status--passed';
            case 'failed': return 'test-details-dialog__status--failed';
            case 'running': return 'test-details-dialog__status--running';
            default: return 'test-details-dialog__status--pending';
        }
    };

    const passedCount = testDetails.filter(t => t.status?.toLowerCase() === 'passed').length;
    const failedCount = testDetails.filter(t => t.status?.toLowerCase() === 'failed').length;
    const totalCount = testDetails.length;

    return (
        <div className="test-details-dialog__overlay" onClick={onClose}>
            <div className="test-details-dialog" onClick={e => e.stopPropagation()}>
                <div className="test-details-dialog__header">
                    <h2 className="test-details-dialog__title">
                        🧪 Tests: {nodeTitle}
                    </h2>
                    <button className="test-details-dialog__close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="test-details-dialog__summary">
                    <div className="test-details-dialog__stat test-details-dialog__stat--total">
                        📊 Total: {totalCount}
                    </div>
                    <div className="test-details-dialog__stat test-details-dialog__stat--passed">
                        ✅ Passed: {passedCount}
                    </div>
                    <div className="test-details-dialog__stat test-details-dialog__stat--failed">
                        ❌ Failed: {failedCount}
                    </div>
                    {totalCount > 0 && (
                        <div className="test-details-dialog__stat test-details-dialog__stat--rate">
                            📈 Pass Rate: {Math.round((passedCount / totalCount) * 100)}%
                        </div>
                    )}
                </div>

                {testFilePath && (
                    <div className="test-details-dialog__file-path">
                        <span>📄 Test File: </span>
                        <button
                            className="test-details-dialog__file-link"
                            onClick={() => onOpenFile(testFilePath)}
                        >
                            {testFilePath}
                        </button>
                    </div>
                )}

                <div className="test-details-dialog__content">
                    {testDetails.length === 0 ? (
                        <div className="test-details-dialog__empty">
                            No tests found. Generate tests from BDD spec first.
                        </div>
                    ) : (
                        <div className="test-details-dialog__list">
                            {testDetails.map((test, index) => (
                                <div key={index} className="test-details-dialog__item">
                                    <div className="test-details-dialog__item-header">
                                        <span className="test-details-dialog__item-icon">
                                            {getStatusIcon(test.status)}
                                        </span>
                                        <span className="test-details-dialog__item-title">
                                            {test.title}
                                        </span>
                                        <span className={`test-details-dialog__item-status ${getStatusClass(test.status)}`}>
                                            {test.status || 'pending'}
                                        </span>
                                    </div>

                                    {test.actualResult && (
                                        <div className="test-details-dialog__item-details">
                                            <div className="test-details-dialog__item-section">
                                                <span className="test-details-dialog__item-label">Actual:</span>
                                                <pre className="test-details-dialog__item-code">{test.actualResult}</pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="test-details-dialog__footer">
                    <button
                        className="test-details-dialog__button test-details-dialog__button--secondary"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TestDetailsDialog;
