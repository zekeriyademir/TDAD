import React, { useState } from 'react';
import { AutopilotModes } from '../../shared/types';
import { isAutopilotComingSoon, isValidBetaCode } from '../../shared/utils/FeatureGating';
export type AutopilotMode = 'bdd' | 'test' | 'run-fix';

export type { AutopilotModes };

interface AutopilotConfirmDialogProps {
  isOpen: boolean;
  pendingCount: number;
  folderName: string;
  isAllFolders?: boolean;
  isSingleNode?: boolean;
  nodeName?: string;
  onConfirm: (modes: AutopilotModes, maxRetries: number) => void;
  onCancel: () => void;
  onOpenSettings?: () => void;
  existingBetaCode?: string;
  postMessage?: (message: any) => void;
}

const MODE_OPTIONS: { value: AutopilotMode; label: string; icon: string; description: string }[] = [
  { value: 'bdd', label: 'BDD', icon: '📋', description: 'Generate BDD specs' },
  { value: 'test', label: 'Test', icon: '🧪', description: 'Generate tests' },
  { value: 'run-fix', label: 'Run+Fix', icon: '🔄', description: 'Run and fix' }
];

export const AutopilotConfirmDialog: React.FC<AutopilotConfirmDialogProps> = ({
  isOpen,
  pendingCount,
  folderName,
  isAllFolders = false,
  isSingleNode = false,
  nodeName,
  onConfirm,
  onCancel,
  onOpenSettings,
  existingBetaCode,
  postMessage
}) => {
  // Default: all modes selected
  const [selectedModes, setSelectedModes] = useState<Set<AutopilotMode>>(new Set(['bdd', 'test', 'run-fix']));
  const [maxRetries, setMaxRetries] = useState<number>(10);

  const isComingSoon = isAutopilotComingSoon();
  const [joinState, setJoinState] = useState<'idle' | 'joining' | 'success'>('idle');
  const [betaCodeInput, setBetaCodeInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Check if user already has valid beta code from settings
  const hasValidBetaCode = existingBetaCode && isValidBetaCode(existingBetaCode);

  // Debug logging via postMessage
  if (postMessage && isOpen) {
    postMessage({ command: 'canvasLog', message: `[AUTOPILOT DEBUG] Dialog props: isOpen=${isOpen}, hasValidBetaCode=${hasValidBetaCode}, isUnlocked=${isUnlocked}, isComingSoon=${isComingSoon}` });
  }

  // Reset unlock state when dialog closes to prevent state persistence
  React.useEffect(() => {
    if (!isOpen) {
      setIsUnlocked(false);
      setBetaCodeInput('');
      setJoinState('idle');
      setCodeError('');
      setIsUnlocking(false);
    }
  }, [isOpen]);

  if (!isOpen) {return null;}

  // --- WAITLIST UI RENDER ---
  // Show beta window only if feature is coming soon AND user doesn't have valid beta code AND hasn't unlocked in this session
  const shouldShowBetaWindow = isComingSoon && !hasValidBetaCode && !isUnlocked;
  if (postMessage && isOpen) {
    postMessage({ command: 'canvasLog', message: `[AUTOPILOT DEBUG] Should show beta window? ${shouldShowBetaWindow} (isComingSoon=${isComingSoon}, hasValidBetaCode=${hasValidBetaCode}, isUnlocked=${isUnlocked})` });
  }

  if (shouldShowBetaWindow) {
    const handleJoin = () => {
      setJoinState('joining');
      window.open('https://tdad.ai', '_blank');
      setTimeout(() => setJoinState('idle'), 1000);
    };

    return (
      <div className="autopilot-confirm-overlay" onClick={onCancel}>
        <div className="autopilot-confirm-dialog" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '40px', maxWidth: '500px', position: 'relative' }}>
           <button
             className="autopilot-dialog-close-x"
             onClick={onCancel}
             aria-label="Close"
             title="Close"
           >
             ✕
           </button>
           <div style={{ fontSize: '48px', marginBottom: '24px' }}>
             ✈
           </div>

           <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#7c3aed', marginBottom: '16px', marginTop: 0 }}>
             {joinState === 'success' ? "You're on the list!" : "Auto-Pilot is in Closed Beta"}
           </h3>

           <p style={{ color: 'var(--vscode-descriptionForeground)', lineHeight: 1.6, marginBottom: '28px', fontSize: '15px' }}>
             {joinState === 'success'
               ? "You've secured your spot as a Founding Member. We'll verify your email and notify you when your exclusive access is ready."
                : (
                  <>
                    Auto-Pilot automates the repetitive loop of BDD {'->'} Test {'->'} Fix by orchestrating your CLI agents (Claude, Cursor, etc).
                    <br/><br/>
                    <strong>Note:</strong> You can always run these steps manually for free. Auto-Pilot is a convenience feature for when you want to ship faster without the copy-pasting.
                    <br/><br/>
                    <span style={{ color: '#7c3aed', fontWeight: 600 }}>Closed Beta Offer:</span> The first 100 active users will get a <strong>Lifetime Free License</strong> when we launch soon.
                 </>
               )}
           </p>

           {joinState !== 'success' && (
             <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', maxWidth: '380px', margin: '0 auto 24px auto', justifyContent: 'center' }}>
               <button
                 onClick={handleJoin}
                 disabled={joinState === 'joining'}
                 style={{
                   padding: '12px 32px',
                   background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                   color: 'white',
                   border: 'none',
                   borderRadius: '8px',
                   cursor: 'pointer',
                   fontWeight: 600,
                   fontSize: '15px',
                   opacity: joinState === 'joining' ? 0.7 : 1,
                   boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                 }}
               >
                 {joinState === 'joining' ? 'Opening...' : 'Join Waitlist'}
               </button>
             </div>
           )}

           <button
             onClick={onCancel}
             style={{
               background: 'transparent',
               border: 'none',
               color: 'var(--vscode-descriptionForeground)',
               textDecoration: 'underline',
               cursor: 'pointer',
               fontSize: '13px'
             }}
           >
             Close
           </button>

           <div style={{ marginTop: '20px', borderTop: '1px solid var(--vscode-widget-border)', paddingTop: '15px' }}>
             <p style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)', marginBottom: '8px' }}>
               Have a Beta Code?
             </p>
             <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
               <input
                 type="text"
                 placeholder="Enter code"
                 value={betaCodeInput}
                 onChange={(e) => {
                  setBetaCodeInput(e.target.value);
                  setCodeError('');
                }}
                 style={{
                   padding: '6px',
                   borderRadius: '4px',
                   border: `1px solid ${codeError ? '#f87171' : 'var(--vscode-input-border)'}`,
                   background: 'var(--vscode-input-background)',
                   color: 'var(--vscode-input-foreground)',
                   fontSize: '12px',
                   width: '120px'
                 }}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     if (isValidBetaCode(betaCodeInput)) {
                       if (postMessage) {
                         postMessage({ command: 'canvasLog', message: '[AUTOPILOT DEBUG] Enter key pressed, valid code' });
                       }
                       setIsUnlocking(true);
                       setIsUnlocked(true);
                       // Persist the beta code to settings
                       if (postMessage) {
                         postMessage({ command: 'canvasLog', message: '[AUTOPILOT DEBUG] Sending updateAutopilotSettings message' });
                         postMessage({
                           command: 'updateAutopilotSettings',
                           autopilotSettings: { betaCode: betaCodeInput }
                         });
                       } else {
                         // postMessage not available - should not happen in normal flow
                       }
                     } else {
                       setCodeError('Invalid beta code');
                     }
                   }
                 }}
               />
               <button
                 style={{
                   padding: '6px 12px',
                   borderRadius: '4px',
                   border: '1px solid var(--vscode-button-border)',
                   background: 'var(--vscode-button-secondaryBackground)',
                   color: 'var(--vscode-button-secondaryForeground)',
                   fontSize: '12px',
                   cursor: isUnlocking ? 'default' : 'pointer',
                   opacity: isUnlocking ? 0.6 : 1
                 }}
                 onClick={() => {
                   if (isValidBetaCode(betaCodeInput)) {
                     if (postMessage) {
                       postMessage({ command: 'canvasLog', message: '[AUTOPILOT DEBUG] Unlock button clicked, valid code' });
                     }
                     setIsUnlocking(true);
                     setIsUnlocked(true);
                     // Persist the beta code to settings
                     if (postMessage) {
                       postMessage({ command: 'canvasLog', message: '[AUTOPILOT DEBUG] Sending updateAutopilotSettings message' });
                       postMessage({
                         command: 'updateAutopilotSettings',
                         autopilotSettings: { betaCode: betaCodeInput }
                       });
                     } else {
                       // postMessage not available - should not happen in normal flow
                     }
                   } else {
                     setCodeError('Invalid beta code');
                   }
                 }}
                 disabled={isUnlocking}
               >
                 {isUnlocking ? 'Unlocking...' : 'Unlock'}
               </button>
             </div>
             {codeError ? (
               <p style={{ fontSize: '11px', color: '#f87171', marginTop: '4px', fontWeight: 500 }}>
                 {codeError}
               </p>
             ) : (
               <p style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px', fontStyle: 'italic' }}>
                 Enter your invitation code to unlock.
               </p>
             )}
           </div>
        </div>
      </div>
    );
  }

  // --- STANDARD DIALOG RENDER ---
  const toggleMode = (mode: AutopilotMode) => {
    const newModes = new Set(selectedModes);
    if (newModes.has(mode)) {
      newModes.delete(mode);
    } else {
      newModes.add(mode);
    }
    setSelectedModes(newModes);
  };

  const handleConfirm = () => {
    // Convert to array in order: bdd, test, run-fix
    const orderedModes: AutopilotModes = [];
    if (selectedModes.has('bdd')) {orderedModes.push('bdd');}
    if (selectedModes.has('test')) {orderedModes.push('test');}
    if (selectedModes.has('run-fix')) {orderedModes.push('run-fix');}
    onConfirm(orderedModes, maxRetries);
  };

  const getMessage = () => {
    if (isSingleNode && nodeName) {
      return <>Run automation for <strong>{nodeName}</strong>?</>;
    }
    if (isAllFolders) {
      return <>Run automation for <strong>{pendingCount}</strong> feature{pendingCount !== 1 ? 's' : ''} across <strong>all folders</strong>?</>;
    }
    return <>Run automation for <strong>{pendingCount}</strong> feature{pendingCount !== 1 ? 's' : ''} in <strong>{folderName}</strong>?</>;
  };

  const getTitle = () => {
    if (isSingleNode) {return 'Auto-Pilot';}
    if (isAllFolders) {return 'Auto-Pilot All Folders';}
    return 'Auto-Pilot All';
  };

  const getSelectedDescription = () => {
    const parts: string[] = [];
    if (selectedModes.has('bdd')) {parts.push('BDD specs');}
    if (selectedModes.has('test')) {parts.push('Test generation');}
    if (selectedModes.has('run-fix')) {parts.push('Run & Fix');}
    if (parts.length === 0) {return 'Select at least one mode';}
    return parts.join(' → ');
  };

  const canConfirm = selectedModes.size > 0;

  return (
    <div className="autopilot-confirm-overlay" onClick={onCancel}>
      <div className="autopilot-confirm-dialog autopilot-confirm-dialog--with-modes" onClick={e => e.stopPropagation()}>
        <div className="autopilot-confirm-icon">
          <span>✈</span>
        </div>
        <div className="autopilot-confirm-title">
          {getTitle()}
        </div>
        <div className="autopilot-confirm-message">
          {getMessage()}
        </div>

        <div className="autopilot-mode-selector">
          <div className="autopilot-mode-label">Select phases to run:</div>
          <div className="autopilot-mode-options">
            {MODE_OPTIONS.map(option => (
              <button
                key={option.value}
                className={`autopilot-mode-option ${selectedModes.has(option.value) ? 'autopilot-mode-option--selected' : ''}`}
                onClick={() => toggleMode(option.value)}
                title={option.description}
              >
                <span className="autopilot-mode-option__icon">{option.icon}</span>
                <span className="autopilot-mode-option__label">{option.label}</span>
              </button>
            ))}
          </div>
          <div className="autopilot-mode-description">
            {getSelectedDescription()}
          </div>
        </div>

        <div className="autopilot-retries-selector">
          <label className="autopilot-retries-label">
            Max Retries:
            <input
              type="number"
              min="0"
              value={maxRetries}
              onChange={(e) => setMaxRetries(Math.max(0, parseInt(e.target.value) || 0))}
              className="autopilot-retries-input"
            />
          </label>
        </div>

        <div className="autopilot-confirm-buttons">
          <button className="autopilot-confirm-btn autopilot-confirm-btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="autopilot-confirm-btn autopilot-confirm-btn--confirm"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Start Auto-Pilot
          </button>
        </div>

        {onOpenSettings && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button
              onClick={() => {
                onCancel();
                onOpenSettings();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#7c3aed',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '12px',
                padding: 0
              }}
            >
              Open Auto-Pilot Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
