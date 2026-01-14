import * as vscode from 'vscode';
import { WorkflowState } from '../../shared/types';

export class WorkflowEditorProvider implements vscode.CustomTextEditorProvider {
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new WorkflowEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            WorkflowEditorProvider.viewType,
            provider
        );
        return providerRegistration;
    }

    private static readonly viewType = 'tdad.workflowEditor';

    constructor(
        private readonly context: vscode.ExtensionContext
    ) {}

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        function updateWebview() {
            try {
                const json = JSON.parse(document.getText());
                webviewPanel.webview.postMessage({
                    type: 'update',
                    workflow: json
                });
            } catch {
                webviewPanel.webview.postMessage({
                    type: 'error',
                    message: 'Invalid workflow file format'
                });
            }
        }

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'update':
                    this.updateTextDocument(document, e.workflow);
                    return;
                case 'export':
                    this.exportWorkflow(e.workflow);
                    return;
            }
        });

        updateWebview();
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'workflowEditor.js'
        ));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'workflowEditor.css'
        ));
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <link href="${styleUri}" rel="stylesheet">
                <title>TDAD Workflow Editor</title>
            </head>
            <body>
                <div id="editor-container">
                    <div id="toolbar">
                        <button id="addNode">Add Node</button>
                        <button id="exportWorkflow">Export</button>
                        <button id="validateWorkflow">Validate</button>
                    </div>
                    <div id="workflow-canvas"></div>
                    <div id="properties-panel">
                        <h3>Node Properties</h3>
                        <div id="node-properties"></div>
                    </div>
                </div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }

    private updateTextDocument(document: vscode.TextDocument, workflow: WorkflowState) {
        const edit = new vscode.WorkspaceEdit();
        
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            JSON.stringify(workflow, null, 2)
        );

        return vscode.workspace.applyEdit(edit);
    }

    private async exportWorkflow(workflow: WorkflowState) {
        const uri = await vscode.window.showSaveDialog({
            filters: {
                'TDAD Workflow': ['tdad'],
                'JSON': ['json']
            },
            defaultUri: vscode.Uri.file('workflow.tdad')
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(
                uri,
                Buffer.from(JSON.stringify(workflow, null, 2), 'utf8')
            );
            vscode.window.showInformationMessage('Workflow exported successfully');
        }
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}