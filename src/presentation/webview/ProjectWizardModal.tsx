import React, { useState, useEffect } from 'react';

export type TabMode = 'new-project' | 'existing-project';
export type WizardStepId = 'idea' | 'scaffold' | 'blueprint' | 'refactor' | 'manual';

interface WizardStep {
    id: WizardStepId;
    title: string;
    description: string;
    completed: boolean;
}

    interface ProjectWizardModalProps {
        show: boolean;
        initialTab?: TabMode;
        onGenerateDocs: (idea: string, techStack: string, projectType: string, database: string) => void;
        onGenerateScaffold: (docPaths: string[], testTypes: string[], testFramework: string) => void;
        onGenerateBlueprint: (mode: 'idea' | 'architecture' | 'refactor', context: string) => void;
    onCancel: () => void;
    onSelectDocsFolder?: () => void;
    docsFolderValue?: string;
    onDocsFolderChange?: (value: string) => void;
    automationMode?: boolean;
    onStartAutomation?: (mode: TabMode, projectContext: string) => void;
    // Step 2 - Scaffold doc files
    onSelectDocFile?: () => void;
    scaffoldDocs?: string[];
}

export const ProjectWizardModal: React.FC<ProjectWizardModalProps> = ({
    show,
    initialTab = 'new-project',
    onGenerateDocs,
    onGenerateScaffold,
    onGenerateBlueprint,
    onCancel,
    onSelectDocsFolder,
    docsFolderValue,
    onSelectDocFile,
    scaffoldDocs: scaffoldDocsProp
}) => {
    // Persistent State
    const [activeTab, setActiveTab] = useState<TabMode>(initialTab);
    const [activeStepId, setActiveStepId] = useState<WizardStepId>('idea');

    // Form State
    const [ideaText, setIdeaText] = useState('');
    const [techStack, setTechStack] = useState('ai-decide');
    const [techStackCustom, setTechStackCustom] = useState('');
    const [projectType, setProjectType] = useState('ai-decide');
    const [projectTypeCustom, setProjectTypeCustom] = useState('');
    const [database, setDatabase] = useState('ai-decide');
    const [databaseCustom, setDatabaseCustom] = useState('');
    const [scaffoldDocFiles, setScaffoldDocFiles] = useState<string[]>([]);
    const [testTypes, setTestTypes] = useState<Set<string>>(new Set(['ui', 'api']));
    const [testFramework, setTestFramework] = useState('playwright');
    const [docsFolder, setDocsFolder] = useState('docs/');
    const [refactorPath, setRefactorPath] = useState('src/');
    const [existingMode, setExistingMode] = useState<'refactor' | 'manual'>('refactor');

    // Step Tracking
    const [completedSteps, setCompletedSteps] = useState<Set<WizardStepId>>(new Set());
    const [copiedStep, setCopiedStep] = useState<WizardStepId | null>(null);

    // Update internal state when props change
    useEffect(() => {
        if (show) {
            setActiveTab(initialTab);
            if (initialTab === 'new-project' && !['idea', 'scaffold', 'blueprint'].includes(activeStepId)) {
                setActiveStepId('idea');
            } else if (initialTab === 'existing-project' && !['refactor', 'manual'].includes(activeStepId)) {
                setActiveStepId('refactor');
            }
            setCopiedStep(null); // Reset copy state on open
        }
    }, [show, initialTab]);

    useEffect(() => {
        if (docsFolderValue !== undefined && docsFolderValue !== '') {
            setDocsFolder(docsFolderValue);
        }
    }, [docsFolderValue]);

    // Sync scaffold docs from props
    useEffect(() => {
        if (scaffoldDocsProp !== undefined) {
            setScaffoldDocFiles(scaffoldDocsProp);
        }
    }, [scaffoldDocsProp]);

    if (!show) {
        return null;
    }

    // Step Definitions
    const newProjectSteps: WizardStep[] = [
        { id: 'idea', title: 'Define & Document', description: 'Idea -> PRD & Architecture', completed: completedSteps.has('idea') },
        { id: 'scaffold', title: 'Scaffold Structure', description: 'Create files from Architecture', completed: completedSteps.has('scaffold') },
        { id: 'blueprint', title: 'Generate Blueprint', description: 'Map structure to Nodes', completed: completedSteps.has('blueprint') }
    ];

    const existingProjectSteps: WizardStep[] = [
        { id: 'refactor', title: 'Map Codebase', description: 'Reverse engineer existing code', completed: completedSteps.has('refactor') },
    ];

    const currentSteps = activeTab === 'new-project' ? newProjectSteps : existingProjectSteps;

    // Handlers
    const handleCopy = (stepId: WizardStepId, action: () => void) => {
        action();
        setCopiedStep(stepId);
        setCompletedSteps(prev => new Set(prev).add(stepId));
        
        // Removed auto-advance. 
        // We now wait for user to click "Next"
    };

    const toggleTestType = (type: string) => {
        const newSet = new Set(testTypes);
        if (newSet.has(type)) {
            newSet.delete(type);
        } else {
            newSet.add(type);
        }
        setTestTypes(newSet);
    };

    const handleNext = (nextStepId: WizardStepId) => {
        setActiveStepId(nextStepId);
        setCopiedStep(null);
    };

    const getFinalValue = (selectVal: string, customVal: string) => {
        if (selectVal === 'custom') {return customVal;}
        if (selectVal === 'ai-decide') {return 'Let AI Decide';}
        return selectVal;
    };

    const handleRemoveDocFile = (filePath: string) => {
        setScaffoldDocFiles(prev => prev.filter(f => f !== filePath));
    };

    const InstructionBox = ({ nextStepId, onNext, onCopyAgain }: { nextStepId?: WizardStepId, onNext?: () => void, onCopyAgain?: () => void }) => (
        <div className="wizard-instruction-box">
            <div className="wizard-instruction-title">
                <span>✅</span> Prompt Copied!
            </div>
            <ol className="wizard-instruction-steps">
                <li>Switch to your AI Agent (Cursor / Claude).</li>
                <li><strong>Paste (Ctrl+V)</strong> the prompt and run it.</li>
                <li>Wait for the AI to create/update files.</li>
                <li>When done, come back here and click Next.</li>
            </ol>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {onCopyAgain && (
                    <button
                        className="wizard-btn wizard-btn-secondary"
                        onClick={onCopyAgain}
                        style={{ fontSize: '12px' }}
                    >
                        📋 Copy Again
                    </button>
                )}
                {nextStepId && onNext && (
                    <button
                        className="wizard-btn wizard-btn-primary"
                        onClick={onNext}
                        style={{ marginLeft: 'auto' }}
                    >
                        I'm Ready for Step {newProjectSteps.findIndex(s => s.id === nextStepId) + 1} →
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="tdad-modal-overlay">
            <div className="wizard-container">
                
                {/* LEFT SIDEBAR */}
                <div className="wizard-sidebar">
                    <div className="wizard-sidebar-header">
                        <h3 className="wizard-sidebar-title">
                            <span>🚀</span> Project Wizard
                        </h3>
                    </div>
                    
                    <div className="wizard-mode-tabs">
                        <button 
                            className={`wizard-mode-tab ${activeTab === 'new-project' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('new-project'); setActiveStepId('idea'); setCopiedStep(null); }}
                        >
                            ✨ New Project
                        </button>
                        <button 
                            className={`wizard-mode-tab ${activeTab === 'existing-project' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('existing-project'); setActiveStepId('refactor'); setCopiedStep(null); }}
                        >
                            📂 Map Existing
                        </button>
                    </div>

                    <div className="wizard-steps">
                        {currentSteps.map((step, index) => (
                            <div 
                                key={step.id}
                                className={`wizard-step-item ${activeStepId === step.id ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
                                onClick={() => setActiveStepId(step.id)}
                            >
                                <div className="wizard-step-badge">
                                    {step.completed ? '✓' : index + 1}
                                </div>
                                <div className="wizard-step-content">
                                    <div className="wizard-step-title">{step.title}</div>
                                    <div className="wizard-step-desc">{step.description}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT CONTENT */}
                <div className="wizard-content">
                    <button 
                        onClick={onCancel}
                        className="wizard-close-btn"
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--vscode-descriptionForeground)',
                            cursor: 'pointer',
                            fontSize: '18px',
                            padding: '8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s',
                            zIndex: 10
                        }}
                    >✕</button>

                    {/* NEW PROJECT - STEP 1: IDEA */}
                    {activeTab === 'new-project' && activeStepId === 'idea' && (
                        <div className="fade-in">
                            <div className="wizard-content-header">
                                <h2 className="wizard-content-title">Define & Document</h2>
                                <div className="wizard-content-subtitle">Step 1: Turn your idea into professional documentation.</div>
                            </div>
                            <div className="wizard-content-body">
                                <div className="wizard-card">
                                    <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                                        Describe your app idea. AI will generate <strong>PRD.md</strong>, <strong>ARCHITECTURE.md</strong>, and <strong>README.md</strong>.
                                    </div>
                                    <textarea
                                        className="wizard-textarea"
                                        value={ideaText}
                                        onChange={e => setIdeaText(e.target.value)}
                                        placeholder="e.g. A kanban board app with drag-and-drop tasks, columns, and user assignments. It should use React and Firebase..."
                                        autoFocus
                                    />
                                    
                                    {/* Tech Stack & Project Type Selectors */}
                                    <div className="wizard-settings-grid">
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500 }}>Tech Stack</label>
                                            <select 
                                                value={techStack} 
                                                onChange={e => setTechStack(e.target.value)}
                                                className="wizard-input"
                                                style={{ width: '100%' }}
                                            >
                                                <option value="ai-decide">Let AI Decide</option>
                                                <option value="typescript-node">TypeScript (Node.js)</option>
                                                <option value="python">Python</option>
                                                <option value="go">Go</option>
                                                <option value="rust">Rust</option>
                                                <option value="java">Java</option>
                                                <option value="csharp">C# (.NET)</option>
                                                <option value="php">PHP</option>
                                                <option value="ruby">Ruby</option>
                                                <option value="swift">Swift</option>
                                                <option value="javascript">JavaScript</option>
                                                <option value="custom">Other (Specify)...</option>
                                            </select>
                                            {techStack === 'custom' && (
                                                <input
                                                    type="text"
                                                    className="wizard-input"
                                                    style={{ width: '100%', marginTop: '4px' }}
                                                    placeholder="e.g. Kotlin"
                                                    value={techStackCustom}
                                                    onChange={e => setTechStackCustom(e.target.value)}
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500 }}>Project Type</label>
                                            <select 
                                                value={projectType} 
                                                onChange={e => setProjectType(e.target.value)}
                                                className="wizard-input"
                                                style={{ width: '100%' }}
                                            >
                                                <option value="ai-decide">Let AI Decide</option>
                                                <option value="web-app">Web Application</option>
                                                <option value="api-service">API Service</option>
                                                <option value="cli-tool">CLI Tool</option>
                                                <option value="library">Library / Package</option>
                                                <option value="mobile-app">Mobile App</option>
                                                <option value="desktop-app">Desktop App</option>
                                                <option value="game">Game</option>
                                                <option value="data-pipeline">Data Pipeline</option>
                                                <option value="custom">Other (Specify)...</option>
                                            </select>
                                            {projectType === 'custom' && (
                                                <input
                                                    type="text"
                                                    className="wizard-input"
                                                    style={{ width: '100%', marginTop: '4px' }}
                                                    placeholder="e.g. Browser Extension"
                                                    value={projectTypeCustom}
                                                    onChange={e => setProjectTypeCustom(e.target.value)}
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 500 }}>Database</label>
                                            <select 
                                                value={database} 
                                                onChange={e => setDatabase(e.target.value)}
                                                className="wizard-input"
                                                style={{ width: '100%' }}
                                            >
                                                <option value="ai-decide">Let AI Decide</option>
                                                <option value="postgresql">PostgreSQL</option>
                                                <option value="mysql">MySQL</option>
                                                <option value="sqlite">SQLite</option>
                                                <option value="mongodb">MongoDB</option>
                                                <option value="redis">Redis</option>
                                                <option value="none">None / In-Memory</option>
                                                <option value="custom">Other (Specify)...</option>
                                            </select>
                                            {database === 'custom' && (
                                                <input
                                                    type="text"
                                                    className="wizard-input"
                                                    style={{ width: '100%', marginTop: '4px' }}
                                                    placeholder="e.g. Cassandra"
                                                    value={databaseCustom}
                                                    onChange={e => setDatabaseCustom(e.target.value)}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                                        💡 Tip: Be specific about features and tech stack preference.
                                    </div>
                                </div>
                                
                                {copiedStep === 'idea' ? (
                                    <InstructionBox
                                        nextStepId="scaffold"
                                        onNext={() => handleNext('scaffold')}
                                        onCopyAgain={() => onGenerateDocs(ideaText, getFinalValue(techStack, techStackCustom), getFinalValue(projectType, projectTypeCustom), getFinalValue(database, databaseCustom))}
                                    />
                                ) : (
                                    <div className="wizard-action-bar">
                                        <button 
                                            className="wizard-btn wizard-btn-primary"
                                            onClick={() => handleCopy('idea', () => onGenerateDocs(ideaText, getFinalValue(techStack, techStackCustom), getFinalValue(projectType, projectTypeCustom), getFinalValue(database, databaseCustom)))}
                                            disabled={!ideaText.trim()}
                                        >
                                            📋 Copy Prompt
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* NEW PROJECT - STEP 2: SCAFFOLD */}
                    {activeTab === 'new-project' && activeStepId === 'scaffold' && (
                        <div className="fade-in">
                            <div className="wizard-content-header">
                                <h2 className="wizard-content-title">Scaffold Structure</h2>
                                <div className="wizard-content-subtitle">Step 2: Create physical files from your architecture.</div>
                            </div>
                            <div className="wizard-content-body">
                                <div className="wizard-card">
                                    {/* Test Types Selection - Playwright Only (UI + API) */}
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>Test Configuration (Playwright)</label>
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={testTypes.has('ui')}
                                                    onChange={() => toggleTestType('ui')}
                                                />
                                                UI Tests (E2E)
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={testTypes.has('api')}
                                                    onChange={() => toggleTestType('api')}
                                                />
                                                API Tests
                                            </label>
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', marginTop: '8px' }}>
                                            All tests run with Playwright. No unit tests - only UI and API testing.
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '12px', fontSize: '13px' }}>
                                        Documentation files to include in the scaffold prompt:
                                    </div>

                                    {/* Doc Files List */}
                                    <div style={{
                                        border: '1px solid var(--vscode-input-border)',
                                        borderRadius: '6px',
                                        marginBottom: '12px',
                                        maxHeight: '200px',
                                        overflowY: 'auto'
                                    }}>
                                        {scaffoldDocFiles.length === 0 ? (
                                            <div style={{
                                                padding: '24px',
                                                textAlign: 'center',
                                                color: 'var(--vscode-descriptionForeground)'
                                            }}>
                                                Complete Step 1 first to generate documentation files.
                                            </div>
                                        ) : (
                                            scaffoldDocFiles.map((filePath, index) => (
                                                <div
                                                    key={index}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '8px 12px',
                                                        borderBottom: index < scaffoldDocFiles.length - 1 ? '1px solid var(--vscode-input-border)' : 'none'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '13px' }}>
                                                        📄 {filePath}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRemoveDocFile(filePath)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--vscode-errorForeground)',
                                                            cursor: 'pointer',
                                                            padding: '2px 6px',
                                                            fontSize: '14px'
                                                        }}
                                                        title="Remove file"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Add more files button */}
                                    <button
                                        className="wizard-btn wizard-btn-secondary"
                                        onClick={onSelectDocFile}
                                        style={{ width: '100%', marginBottom: '16px' }}
                                    >
                                        + Add More Files
                                    </button>

                                    <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                                        Generates a setup script (e.g. <code>npm init</code>, <code>poetry init</code>) for your chosen stack.
                                    </div>
                                </div>

                                {copiedStep === 'scaffold' ? (
                                    <InstructionBox
                                        nextStepId="blueprint"
                                        onNext={() => handleNext('blueprint')}
                                        onCopyAgain={() => onGenerateScaffold(scaffoldDocFiles, Array.from(testTypes), testFramework)}
                                    />
                                ) : (
                                    <div className="wizard-action-bar">
                                        <button className="wizard-btn wizard-btn-secondary" onClick={() => setActiveStepId('idea')}>Back</button>
                                        <button
                                            className="wizard-btn wizard-btn-primary"
                                            onClick={() => handleCopy('scaffold', () => onGenerateScaffold(scaffoldDocFiles, Array.from(testTypes), testFramework))}
                                            disabled={scaffoldDocFiles.length === 0}
                                        >
                                            📋 Copy Prompt
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* NEW PROJECT - STEP 3: BLUEPRINT */}
                    {activeTab === 'new-project' && activeStepId === 'blueprint' && (
                        <div className="fade-in">
                            <div className="wizard-content-header">
                                <h2 className="wizard-content-title">Generate Blueprint</h2>
                                <div className="wizard-content-subtitle">Step 3: Create the TDAD visual workflow.</div>
                            </div>
                            <div className="wizard-content-body">
                                <div className="wizard-card">
                                    <div style={{ marginBottom: '16px' }}>
                                        Where are your documentation files located?
                                    </div>
                                    <input
                                        type="text"
                                        className="wizard-input"
                                        value={docsFolder}
                                        onChange={e => setDocsFolder(e.target.value)}
                                        placeholder="docs/"
                                    />
                                    <button
                                        className="wizard-btn wizard-btn-secondary"
                                        onClick={onSelectDocsFolder}
                                        style={{ width: '100%' }}
                                    >
                                        Browse Folder...
                                    </button>
                                </div>

                                {copiedStep === 'blueprint' ? (
                                    <div className="wizard-instruction-box">
                                        <div className="wizard-instruction-title">
                                            <span>✅</span> Prompt Copied!
                                        </div>
                                        <ol className="wizard-instruction-steps">
                                            <li>Switch to your AI Agent (Cursor / Claude).</li>
                                            <li><strong>Paste (Ctrl+V)</strong> the prompt.</li>
                                            <li>The AI will generate the Blueprint.</li>
                                            <li><strong>Close this wizard</strong> to see your new canvas!</li>
                                        </ol>
                                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <button
                                                className="wizard-btn wizard-btn-secondary"
                                                onClick={() => onGenerateBlueprint('architecture', docsFolder)}
                                                style={{ fontSize: '12px' }}
                                            >
                                                📋 Copy Again
                                            </button>
                                            <button
                                                className="wizard-btn wizard-btn-primary"
                                                onClick={onCancel}
                                            >
                                                Done & Close Wizard
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="wizard-action-bar">
                                        <button className="wizard-btn wizard-btn-secondary" onClick={() => setActiveStepId('scaffold')}>Back</button>
                                        <button 
                                            className="wizard-btn wizard-btn-primary"
                                            onClick={() => handleCopy('blueprint', () => onGenerateBlueprint('architecture', docsFolder))}
                                        >
                                            📋 Copy Prompt
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* EXISTING PROJECT - REFACTOR */}
                    {activeTab === 'existing-project' && activeStepId === 'refactor' && (
                        <div className="fade-in">
                            <div className="wizard-content-header">
                                <h2 className="wizard-content-title">Map Codebase</h2>
                                <div className="wizard-content-subtitle">Create a TDAD topology from existing code.</div>
                            </div>
                            <div className="wizard-content-body">
                                
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            checked={existingMode === 'refactor'} 
                                            onChange={() => setExistingMode('refactor')} 
                                        />
                                        <span>Auto-Scan</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input 
                                            type="radio" 
                                            checked={existingMode === 'manual'} 
                                            onChange={() => setExistingMode('manual')} 
                                        />
                                        <span>Manual Empty Canvas</span>
                                    </label>
                                </div>

                                {existingMode === 'refactor' ? (
                                    <div className="wizard-card">
                                        <div style={{ marginBottom: '16px' }}>
                                            Which folder contains your source code?
                                        </div>
                                        <input
                                            type="text"
                                            className="wizard-input"
                                            value={refactorPath}
                                            onChange={e => setRefactorPath(e.target.value)}
                                            placeholder="src/"
                                        />
                                        <div style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
                                            AI will analyze this folder to detect Features, Actions, and Dependencies.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="wizard-card">
                                        <div>
                                            This will create a clean <code>.tdad/workflows/root.workflow.json</code> file.
                                            You can then drag-and-drop nodes manually.
                                        </div>
                                    </div>
                                )}

                                {copiedStep === 'refactor' ? (
                                    <div className="wizard-instruction-box">
                                        <div className="wizard-instruction-title">
                                            <span>✅</span> Prompt Copied!
                                        </div>
                                        <ol className="wizard-instruction-steps">
                                            <li>Switch to your AI Agent.</li>
                                            <li><strong>Paste (Ctrl+V)</strong> the prompt.</li>
                                            <li>The AI will map your code to TDAD Nodes.</li>
                                            <li><strong>Close this wizard</strong> to see the result.</li>
                                        </ol>
                                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                            <button 
                                                className="wizard-btn wizard-btn-primary"
                                                onClick={onCancel}
                                            >
                                                Done & Close Wizard
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="wizard-action-bar">
                                        {existingMode === 'refactor' ? (
                                            <button 
                                                className="wizard-btn wizard-btn-primary"
                                                onClick={() => handleCopy('refactor', () => onGenerateBlueprint('refactor', refactorPath))}
                                            >
                                                📋 Copy Prompt
                                            </button>
                                        ) : (
                                            <button 
                                                className="wizard-btn wizard-btn-primary"
                                                onClick={() => { onCancel(); /* Logic for empty canvas */ }}
                                            >
                                                Open Empty Canvas
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
