import { useEffect, useRef, useCallback } from 'react';

declare const acquireVsCodeApi: () => any;

interface MessageHandler {
  (message: any): void;
}

// Global singleton to store the VS Code API (can only be acquired once per webview)
let globalVsCodeApi: any = null;

// Direct access to send messages without hook (for use in callbacks defined before postMessage is available)
export const sendVSCodeMessage = (message: any) => {
  if (globalVsCodeApi) {
    globalVsCodeApi.postMessage(message);
  }
};

export const useVSCodeMessaging = (onMessage: MessageHandler) => {
  const vscodeRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only acquire the API once globally
    if (!globalVsCodeApi && typeof acquireVsCodeApi !== 'undefined') {
      try {
        globalVsCodeApi = acquireVsCodeApi();
      } catch (error) {
        // Cannot use Logger in webview context; error will be visible in browser console if needed
      }
    }
    
    vscodeRef.current = globalVsCodeApi;
      
    const messageHandler = (event: MessageEvent) => {
      onMessage(event.data);
    };

    window.addEventListener('message', messageHandler);
    
    // Request initial data only once
    if (!initializedRef.current && vscodeRef.current) {
      setTimeout(() => {
        if (vscodeRef.current) {
          vscodeRef.current.postMessage({ command: 'requestInitialData' });
        }
      }, 100);
      initializedRef.current = true;
    }
    
    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [onMessage]);

  const postMessage = useCallback((message: any) => {
    if (vscodeRef.current) {
      vscodeRef.current.postMessage(message);
    }
    // VS Code API not available - message will be dropped
  }, []);

  return { postMessage, isReady: !!vscodeRef.current };
};


