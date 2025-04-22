// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { marked } from 'marked';
import { getHtmlTemplate } from './components/template';
import { OpenAIService } from './services/openai';
import { CodeSuggestion } from './components/CodeSuggestion';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const provider = new OpenAIViewProvider(context.extensionUri);
	
	// Register the webview provider
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('openai-assistant.view', provider)
	);

	// Register diagnostic collection
	const diagnosticCollection = vscode.languages.createDiagnosticCollection('openai-assistant');
	context.subscriptions.push(diagnosticCollection);

	// Watch for active editor changes
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				updateDiagnostics(editor, diagnosticCollection);
			}
		})
	);

	// Watch for document changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(event => {
			if (event.document === vscode.window.activeTextEditor?.document) {
				updateDiagnostics(vscode.window.activeTextEditor, diagnosticCollection);
			}
		})
	);

	// Register commands for accepting/rejecting suggestions
	context.subscriptions.push(
		vscode.commands.registerCommand('openai-assistant.acceptSuggestion', async (id: string) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;

			const suggestion = CodeSuggestion.getSuggestion(id);
			if (!suggestion) return;

			await editor.edit(editBuilder => {
				editBuilder.replace(suggestion.range, suggestion.suggestion);
			});
			CodeSuggestion.removeSuggestion(editor, suggestion.range.start.line);
		}),

		vscode.commands.registerCommand('openai-assistant.rejectSuggestion', (id: string) => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) return;

			const suggestion = CodeSuggestion.getSuggestion(id);
			if (!suggestion) return;

			CodeSuggestion.removeSuggestion(editor, suggestion.range.start.line);
		}),

		vscode.commands.registerCommand('openai-assistant.analyzeDiagnostics', async () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				vscode.window.showInformationMessage('Please open a file to analyze');
				return;
			}

			// Get all diagnostics for the current file
			const allDiagnostics = vscode.languages.getDiagnostics(editor.document.uri);
			if (allDiagnostics.length === 0) {
				vscode.window.showInformationMessage('No problems found in the current file');
				return;
			}

			// Show progress indicator
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Analyzing code problems...",
				cancellable: false
			}, async (progress) => {
				// Clear existing suggestions
				CodeSuggestion.clearAllSuggestions(editor);

				// Get suggestions for each diagnostic
				const suggestions = await provider.openaiService.analyzeDiagnostics(
					editor.document.getText(),
					allDiagnostics,
					editor.document.fileName
				);

				// Show suggestions
				for (const diagnostic of allDiagnostics) {
					const suggestion = suggestions.get(diagnostic.range.start.line);
					if (suggestion) {
						await CodeSuggestion.showSuggestion(
							editor,
							diagnostic.range,
							suggestion,
							allDiagnostics
						);
					}
				}

				progress.report({ increment: 100 });
			});
		})
	);

	// Add status bar item
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = "$(lightbulb) Analyze Code";
	statusBarItem.tooltip = "Analyze code problems with OpenAI";
	statusBarItem.command = 'openai-assistant.analyzeDiagnostics';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Initial diagnostics check
	if (vscode.window.activeTextEditor) {
		updateDiagnostics(vscode.window.activeTextEditor, diagnosticCollection);
	}

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "openai-assistant" is now active in the web extension host!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('openai-assistant.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from OpenAI Assistant in a web extension host!');
	});

	context.subscriptions.push(disposable);
}

function updateDiagnostics(editor: vscode.TextEditor, collection: vscode.DiagnosticCollection): void {
	const document = editor.document;
	
	// Get all diagnostics for the current file
	const diagnostics = vscode.languages.getDiagnostics(document.uri);
	
	// Update the diagnostic collection
	collection.set(document.uri, diagnostics);
}

// This method is called when your extension is deactivated
export function deactivate() {}

class OpenAIViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private readonly _apiKey: string;
	readonly openaiService: OpenAIService;

	constructor(private readonly _extensionUri: vscode.Uri) {
		// Read API key from file
		try {
			const keyPath = vscode.Uri.joinPath(_extensionUri, '..', 'openai.key');
			const keyContent = fs.readFileSync(keyPath.fsPath, 'utf8');
			this._apiKey = keyContent.trim();
			if (!this._apiKey) {
				throw new Error('API key is empty');
			}
		} catch (error) {
			console.error('Failed to read OpenAI API key:', error);
			throw new Error('Failed to initialize OpenAI API key. Please ensure openai.key file exists and contains a valid key.');
		}

		// Initialize the service with the API key
		this.openaiService = new OpenAIService(this._apiKey);
		
		// Clear the API key from memory after initialization
		// This helps prevent it from being included in source maps
		Object.defineProperty(this, '_apiKey', {
			value: this._apiKey,
			writable: false,
			enumerable: false,
			configurable: false
		});
	}

	private getOpenFiles(): { fileName: string, uri: string }[] {
		const openFiles = new Map<string, { fileName: string, uri: string }>();

		// Function to safely add a file to the map
		const addFile = (uri: string, fileName: string) => {
			if (!openFiles.has(uri)) {
				openFiles.set(uri, {
					fileName: fileName,
					uri: uri
				});
			}
		};

		// Add files from visible text editors
		vscode.window.visibleTextEditors.forEach(editor => {
			const uri = editor.document.uri;
			if (uri.scheme === 'file') {
				addFile(
					uri.toString(),
					editor.document.fileName.split('/').pop() || ''
				);
			}
		});

		// Add files from workspace text documents
		vscode.workspace.textDocuments.forEach(doc => {
			const uri = doc.uri;
			if (!doc.isUntitled && uri.scheme === 'file') {
				addFile(
					uri.toString(),
					doc.fileName.split('/').pop() || ''
				);
			}
		});

		// Convert Map values to Array and sort by filename
		return Array.from(openFiles.values()).sort((a, b) => 
			a.fileName.localeCompare(b.fileName)
		);
	}

	private updateOpenFiles() {
		if (this._view) {
			const files = this.getOpenFiles();
			console.log('Updating open files:', files.map(f => f.fileName)); // More readable debug log
			this._view.webview.postMessage({
				type: 'updateOpenFiles',
				files: files
			});
		}
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = getHtmlTemplate(webviewView.webview);

		// Initial update of open files
		this.updateOpenFiles();

		// Watch for text document changes
		const disposable = vscode.Disposable.from(
			vscode.workspace.onDidOpenTextDocument(() => this.updateOpenFiles()),
			vscode.workspace.onDidCloseTextDocument(() => this.updateOpenFiles())
		);

		// Make sure to dispose when the webview is disposed
		webviewView.onDidDispose(() => disposable.dispose());

		webviewView.webview.onDidReceiveMessage(async data => {
			if (data.type === 'submit') {
				try {
					const activeEditor = vscode.window.activeTextEditor;
					let fileContent = '';
					let fileName = '';

					if (data.selectedFileUri === 'current' && activeEditor) {
						// Use current active editor
						fileContent = activeEditor.document.getText();
						fileName = activeEditor.document.fileName.split('/').pop() || '';
					} else if (data.selectedFileUri && data.selectedFileUri !== '') {
						// Use selected file
						const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(data.selectedFileUri));
						fileContent = document.getText();
						fileName = document.fileName.split('/').pop() || '';
					}
					// If selectedFileUri is empty or undefined, we'll use empty strings for fileContent and fileName

					// Update file info in the webview
					if (this._view) {
						this._view.webview.postMessage({
							type: 'fileInfo',
							value: fileName || 'No file selected'
						});
					}

					const response = await this.openaiService.getResponse(data.value, fileContent, fileName);

					if (this._view) {
						this._view.webview.postMessage({
							type: 'response',
							value: response
						});
					}
				} catch (error) {
					console.error('API Error:', error);
					if (this._view) {
						this._view.webview.postMessage({
							type: 'error',
							value: 'Error processing request: ' + (error as Error).message
						});
					}
				}
			} else if (data.type === 'getOpenFiles') {
				this.updateOpenFiles();
			}
		});
	}
}
