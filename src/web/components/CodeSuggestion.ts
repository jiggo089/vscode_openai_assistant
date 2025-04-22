import * as vscode from 'vscode';

export class CodeSuggestion {
    private static readonly suggestionMap = new Map<string, {
        suggestion: string,
        range: vscode.Range,
        decoration: vscode.TextEditorDecorationType,
        disposables: vscode.Disposable[]
    }>();

    static async showSuggestion(
        editor: vscode.TextEditor,
        range: vscode.Range,
        suggestion: string,
        diagnostics: vscode.Diagnostic[]
    ) {
        const id = `${editor.document.uri.toString()}-${range.start.line}`;
        
        // Remove existing suggestion for this line if any
        this.removeSuggestion(editor, range.start.line);

        const diagnostic = diagnostics.find(d => d.range.start.line === range.start.line);
        const errorMessage = diagnostic ? diagnostic.message : 'Unknown error';

        // Create hover message
        const hoverMessage = new vscode.MarkdownString(undefined, true);
        hoverMessage.isTrusted = true;
        hoverMessage.supportHtml = true;
        
        const acceptCommand = `command:openai-assistant.acceptSuggestion?${encodeURIComponent(JSON.stringify([id]))}`;
        const rejectCommand = `command:openai-assistant.rejectSuggestion?${encodeURIComponent(JSON.stringify([id]))}`;
        
        hoverMessage.appendMarkdown(`**Error:** ${errorMessage}\n\n`);
        hoverMessage.appendMarkdown(`**Suggestion:** \`${suggestion}\`\n\n`);
        hoverMessage.appendMarkdown(`<a href="${acceptCommand}">✓ Accept</a> | <a href="${rejectCommand}">✗ Reject</a>`);

        // Create inline decoration
        const inlineDecoration = vscode.window.createTextEditorDecorationType({
            after: {
                contentText: '💡',
                margin: '0 0 0 1em',
                color: new vscode.ThemeColor('editorLightBulb.foreground')
            },
            backgroundColor: new vscode.ThemeColor('editor.hoverHighlightBackground'),
            isWholeLine: true,
            overviewRulerColor: new vscode.ThemeColor('editorLightBulb.foreground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right
        });

        // Add hover provider for this line
        const hoverProvider = vscode.languages.registerHoverProvider({ scheme: editor.document.uri.scheme }, {
            provideHover: (document, position) => {
                if (document.uri.toString() === editor.document.uri.toString() &&
                    position.line === range.start.line) {
                    return new vscode.Hover(hoverMessage, range);
                }
                return null;
            }
        });

        editor.setDecorations(inlineDecoration, [range]);

        this.suggestionMap.set(id, {
            suggestion,
            range,
            decoration: inlineDecoration,
            disposables: [hoverProvider]
        });
    }

    static removeSuggestion(editor: vscode.TextEditor, line: number) {
        const id = `${editor.document.uri.toString()}-${line}`;
        const existing = this.suggestionMap.get(id);
        if (existing) {
            editor.setDecorations(existing.decoration, []);
            existing.decoration.dispose();
            existing.disposables.forEach(d => d.dispose());
            this.suggestionMap.delete(id);
        }
    }

    static getSuggestion(id: string) {
        return this.suggestionMap.get(id);
    }

    static clearAllSuggestions(editor: vscode.TextEditor) {
        for (const [id, { decoration, disposables }] of this.suggestionMap.entries()) {
            if (id.startsWith(editor.document.uri.toString())) {
                editor.setDecorations(decoration, []);
                decoration.dispose();
                disposables.forEach(d => d.dispose());
                this.suggestionMap.delete(id);
            }
        }
    }
} 