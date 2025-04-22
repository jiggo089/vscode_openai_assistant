export const styles = `
    body {
        padding: 10px;
        font-family: var(--vscode-font-family);
        display: flex;
        flex-direction: column;
        height: 100vh;
        margin: 0;
    }
    .input-section {
        margin-bottom: 10px;
    }
    textarea {
        width: 100%;
        height: 100px;
        padding: 8px;
        box-sizing: border-box;
        background-color: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border);
        margin-bottom: 8px;
    }
    .button-group {
        display: flex;
        gap: 8px;
    }
    .file-selector {
        flex: 1;
        padding: 8px;
        background-color: var(--vscode-dropdown-background);
        color: var(--vscode-dropdown-foreground);
        border: 1px solid var(--vscode-dropdown-border);
        cursor: pointer;
    }
    .file-selector:focus {
        outline: 1px solid var(--vscode-focusBorder);
        outline-offset: -1px;
    }
    button {
        padding: 8px 16px;
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        cursor: pointer;
        min-width: 120px;
    }
    button:hover {
        background-color: var(--vscode-button-hoverBackground);
    }
    .output-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        background-color: var(--vscode-editor-background);
        border: 1px solid var(--vscode-panel-border);
        border-radius: 4px;
        overflow: hidden;
    }
    .output-header {
        padding: 8px;
        background-color: var(--vscode-panelSectionHeader-background);
        color: var(--vscode-panelSectionHeader-foreground);
        font-weight: bold;
        border-bottom: 1px solid var(--vscode-panel-border);
    }
    #response {
        flex: 1;
        padding: 10px;
        overflow-y: auto;
        color: var(--vscode-editor-foreground);
    }
    .file-info {
        margin-bottom: 10px;
        padding: 8px;
        background-color: var(--vscode-panelSectionHeader-background);
        color: var(--vscode-panelSectionHeader-foreground);
        border-radius: 4px;
    }
    /* Markdown styles */
    #response h1, #response h2, #response h3, #response h4, #response h5, #response h6 {
        color: #000000;
        margin-top: 1em;
        margin-bottom: 0.5em;
        font-weight: bold;
    }
    #response p {
        margin: 0.5em 0;
        line-height: 1.5;
    }
    #response code {
        background-color: #f0f0f0;
        color: #000000;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: var(--vscode-editor-font-family);
    }
    #response pre {
        background-color: #f0f0f0;
        color: #000000;
        padding: 1em;
        border-radius: 4px;
        overflow-x: auto;
        border: 1px solid #cccccc;
    }
    #response pre code {
        background-color: transparent;
        padding: 0;
        color: inherit;
    }
    #response ul, #response ol {
        padding-left: 2em;
        margin: 0.5em 0;
    }
    #response li {
        margin: 0.25em 0;
    }
    #response blockquote {
        border-left: 4px solid #cccccc;
        margin: 0.5em 0;
        padding: 0.5em 1em;
        background-color: #f5f5f5;
        color: #333333;
    }
    #response a {
        color: #0066cc;
        text-decoration: none;
    }
    #response a:hover {
        text-decoration: underline;
    }
    #response table {
        border-collapse: collapse;
        width: 100%;
        margin: 0.5em 0;
        border: 1px solid #cccccc;
    }
    #response th, #response td {
        border: 1px solid #cccccc;
        padding: 0.5em;
    }
    #response th {
        background-color: #f0f0f0;
        color: #000000;
        font-weight: bold;
    }
    #response tr:nth-child(even) {
        background-color: #f5f5f5;
    }
    #response hr {
        border: none;
        border-top: 1px solid #cccccc;
        margin: 1em 0;
    }
    #response img {
        max-width: 100%;
        height: auto;
    }
`; 