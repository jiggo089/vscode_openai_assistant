import type { Webview } from 'vscode';
import { styles } from './styles';

export const getHtmlTemplate = (webview: Webview) => {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OpenAI Assistant</title>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        <style>${styles}</style>
    </head>
    <body>
        <div class="file-info" id="fileInfo">
            No file selected
        </div>
        <div class="input-section">
            <textarea id="input" placeholder="Введите ваш запрос..."></textarea>
            <div class="button-group">
                <select id="fileSelector" class="file-selector" onclick="updateFileList()">
                    <option value="">None</option>
                    <option value="current">Current file</option>
                </select>
                <button onclick="submit()">Отправить</button>
            </div>
        </div>
        <div class="output-section">
            <div class="output-header">Ответ от OpenAI</div>
            <div id="response"></div>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            const responseDiv = document.getElementById('response');
            const input = document.getElementById('input');
            const fileInfo = document.getElementById('fileInfo');
            const fileSelector = document.getElementById('fileSelector');

            function updateFileInfo(fileName) {
                fileInfo.textContent = fileName ? 'Current file: ' + fileName : 'No file selected';
            }

            function updateFileList() {
                vscode.postMessage({ type: 'getOpenFiles' });
            }

            function updateFileSelector(files) {
                const currentValue = fileSelector.value;
                
                // Keep only the first two options (None and Current file)
                while (fileSelector.options.length > 2) {
                    fileSelector.remove(2);
                }
                
                // Add new options
                files.forEach(file => {
                    const option = document.createElement('option');
                    option.value = file.uri;
                    option.textContent = file.fileName;
                    fileSelector.appendChild(option);
                });

                // Try to restore the previously selected value if it still exists
                if (currentValue) {
                    for (let i = 0; i < fileSelector.options.length; i++) {
                        if (fileSelector.options[i].value === currentValue) {
                            fileSelector.selectedIndex = i;
                            break;
                        }
                    }
                }
            }

            function submit() {
                const value = input.value;
                if (value) {
                    responseDiv.innerHTML = 'Обработка запроса...';
                    vscode.postMessage({
                        type: 'submit',
                        value: value,
                        selectedFileUri: fileSelector.value === 'current' ? 'current' : fileSelector.value
                    });
                }
            }

            // Initial file list update
            updateFileList();

            window.addEventListener('message', event => {
                const message = event.data;
                if (message.type === 'response') {
                    responseDiv.innerHTML = marked.parse(message.value);
                } else if (message.type === 'error') {
                    responseDiv.textContent = message.value;
                } else if (message.type === 'fileInfo') {
                    updateFileInfo(message.value);
                } else if (message.type === 'updateOpenFiles') {
                    updateFileSelector(message.files);
                }
            });
        </script>
    </body>
    </html>`;
}; 