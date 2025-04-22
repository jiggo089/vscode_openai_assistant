import * as vscode from 'vscode';

export class OpenAIService {
    private readonly apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getResponse(prompt: string, fileContent?: string, fileName?: string): Promise<string> {
        try {
            const fullPrompt = fileContent 
                ? 'File: ' + fileName + '\n\nContent:\n' + fileContent + '\n\nQuestion: ' + prompt
                : prompt;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "user",
                            content: fullPrompt
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error?.message || 'Unknown error'}`);
            }

            const result = await response.json();
            return result.choices[0]?.message?.content || 'No response received';
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async analyzeDiagnostics(
        fileContent: string,
        diagnostics: vscode.Diagnostic[],
        fileName: string
    ): Promise<Map<number, string>> {
        const suggestions = new Map<number, string>();
        
        // Handle empty file case
        if (!fileContent.trim()) {
            const lineNumber = 0;
            suggestions.set(lineNumber, '{}');
            return suggestions;
        }

        // Deduplicate diagnostics by their range
        const uniqueDiagnostics = new Map<string, vscode.Diagnostic>();
        for (const diagnostic of diagnostics) {
            const key = `${diagnostic.range.start.line}:${diagnostic.range.start.character}:${diagnostic.range.end.line}:${diagnostic.range.end.character}`;
            if (!uniqueDiagnostics.has(key)) {
                uniqueDiagnostics.set(key, diagnostic);
            }
        }

        // Limit the number of diagnostics to process
        const MAX_DIAGNOSTICS = 5;
        let processedCount = 0;

        for (const diagnostic of uniqueDiagnostics.values()) {
            if (processedCount >= MAX_DIAGNOSTICS) break;
            
            const lineNumber = diagnostic.range.start.line;
            const errorMessage = diagnostic.message;
            const lineContent = fileContent.split('\n')[lineNumber];

            // Get some context by including surrounding lines
            const startLine = Math.max(0, lineNumber - 2);
            const endLine = Math.min(fileContent.split('\n').length - 1, lineNumber + 2);
            const contextLines = fileContent.split('\n').slice(startLine, endLine + 1);
            const contextWithLineNumbers = contextLines
                .map((line, i) => `${startLine + i + 1}: ${line}`)
                .join('\n');

            const prompt = `Fix this error: "${errorMessage}"

Context (line numbers included):
${contextWithLineNumbers}

Requirements:
- Focus on line ${lineNumber + 1}
- Provide ONLY the corrected code line
- No explanations, no backticks, no formatting
- The fix should maintain the code style of surrounding lines
- The response must be valid code that can directly replace the problematic line`;

            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini",
                        messages: [
                            {
                                role: "user",
                                content: prompt
                            }
                        ],
                        temperature: 0.3
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('OpenAI API Error:', errorData);
                    throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error?.message || 'Unknown error'}`);
                }

                const result = await response.json();
                let suggestion = result.choices[0]?.message?.content?.trim() || 'No suggestion available';
                
                // Clean up the suggestion
                suggestion = suggestion
                    .replace(/^```\w*\s*/, '')  // Remove opening ```language
                    .replace(/```$/, '')         // Remove closing ```
                    .replace(/^\d+:\s*/, '')    // Remove line numbers if present
                    .trim();                     // Remove any extra whitespace

                suggestions.set(lineNumber, suggestion);
                processedCount++;
                
                // Add a small delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.error('API Error:', error);
                suggestions.set(lineNumber, 'Failed to get suggestion');
            }
        }

        return suggestions;
    }
} 