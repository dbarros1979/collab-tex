// Application state
let currentBranch = 'main';
let currentFile = 'main.tex';
let fileContents = {};
let openTabs = ['main.tex'];
let isCompiling = false;
let isLoggedIn = false;
let editor;
let editHistory = {};
let editHistoryIndex = {};
let pdfFrame = null;
let currentZoom = 1.0;
let editorFontSize = 14;
let isResizing = false;
let lastDownX = 0;
let codePanelWidth = 50; // percentage
let previewPanelWidth = 50; // percentage
let currentLayout = 'split'; // 'split', 'code-full', 'preview-full'

// DOM elements
const branchDropdownBtn = document.getElementById('branchDropdownBtn');
const branchDropdown = document.getElementById('branchDropdown');
const currentBranchDisplay = document.getElementById('currentBranchDisplay');
const fileList = document.getElementById('fileList');
const editorTabs = document.getElementById('editorTabs');
const texEditor = document.getElementById('texEditor');
const pdfContainer = document.getElementById('pdfContainer');
const pdfPlaceholder = document.getElementById('pdfPlaceholder');
const currentFileElement = document.getElementById('currentFile');
const compileBtn = document.getElementById('compileBtn');
const compileText = document.getElementById('compileText');
const reloadBtn = document.getElementById('reloadBtn');
const saveBtn = document.getElementById('saveBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const wordCountBtn = document.getElementById('wordCountBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomResetBtn = document.getElementById('zoomResetBtn');
const zoomDisplay = document.getElementById('zoomDisplay');
const fontSmallerBtn = document.getElementById('fontSmallerBtn');
const fontLargerBtn = document.getElementById('fontLargerBtn');
const fontSizeDisplay = document.getElementById('fontSizeDisplay');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const downloadBtn = document.getElementById('downloadBtn');
const toggleLog = document.getElementById('toggleLog');
const compilationLog = document.getElementById('compilationLog');
const logContent = document.getElementById('logContent');
const statusMessage = document.getElementById('statusMessage');
const connectionStatus = document.getElementById('connectionStatus');
const saveStatus = document.getElementById('saveStatus');
const saveStatusText = document.getElementById('saveStatusText');
const latexStatus = document.getElementById('latexStatus');
const notification = document.getElementById('notification');
const resizer = document.getElementById('resizer');
const codePanel = document.getElementById('codePanel');
const previewPanel = document.getElementById('previewPanel');
const editorContainer = document.getElementById('editorContainer');
const codeFullBtn = document.getElementById('codeFullBtn');
const previewFullBtn = document.getElementById('previewFullBtn');
const splitViewBtn = document.getElementById('splitViewBtn');
const layoutIndicator = document.getElementById('layoutIndicator');

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
    setupEventListeners();
    setupResizablePanels();
    updateLayoutIndicator();
    showNotification('Welcome to Collab-Tex!', 'info');
});

// Initialize application state and UI
function initializeApp() {
    // Initialize CodeMirror editor
    editor = CodeMirror.fromTextArea(texEditor, {
        mode: "stex",
        theme: "monokai",
        lineNumbers: true,
        lineWrapping: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        styleActiveLine: true,
        scrollbarStyle: "simple",
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        extraKeys: {
            "Ctrl-S": saveFile,
            "Cmd-S": saveFile,
            "Ctrl-Enter": compileProject,
            "Cmd-Enter": compileProject,
            "Ctrl-Z": undoEdit,
            "Cmd-Z": undoEdit,
            "Ctrl-Y": redoEdit,
            "Shift-Ctrl-Y": redoEdit,
            "Cmd-Y": redoEdit,
            "Shift-Cmd-Y": redoEdit,
            "Tab": "indentMore",
            "Shift-Tab": "indentLess",
            "Ctrl-E": toggleCodeFull, // New shortcut for full code view
            "Ctrl-P": togglePreviewFull, // New shortcut for full preview view
            "Ctrl-S": toggleSplitView // New shortcut for split view
        }
    });

    // Set initial content
    const initialContent = `\\documentclass{article}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\title{Welcome to Collab-Tex}
\\author{Your Name}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
Collab-Tex is an online LaTeX editor with real-time collaboration features. 
Start typing your LaTeX here and click the \\textbf{Compile} button to see the result.

\\subsection{Features}
\\begin{itemize}
\\item Real-time collaboration
\\item Live preview
\\item Multiple file support
\\item Version control integration
\\end{itemize}

\\section{Mathematical Examples}
Here's an example of mathematical typesetting:

\\begin{equation}
E = mc^2
\\end{equation}

And the quadratic formula:
\\[
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
\\]

\\section{Resize and Zoom Test}
Try resizing the panels by dragging the separator between the editor and preview.
Use the zoom controls to adjust the PDF preview size.

\\end{document}`;

    editor.setValue(initialContent);
    fileContents['main.tex'] = initialContent;
    editHistory['main.tex'] = [initialContent];
    editHistoryIndex['main.tex'] = 0;

    updateSaveStatus(true);
    updateConnectionStatus(true);
    updateFontSizeDisplay();
}

// Set up all event listeners
function setupEventListeners() {
    branchDropdownBtn.addEventListener('click', toggleBranchDropdown);
    document.addEventListener('click', closeBranchDropdown);

    compileBtn.addEventListener('click', compileProject);
    reloadBtn.addEventListener('click', reloadPDF);
    saveBtn.addEventListener('click', saveFile);
    undoBtn.addEventListener('click', undoEdit);
    redoBtn.addEventListener('click', redoEdit);
    wordCountBtn.addEventListener('click', showWordCount);
    zoomOutBtn.addEventListener('click', zoomOutPDF);
    zoomInBtn.addEventListener('click', zoomInPDF);
    zoomResetBtn.addEventListener('click', resetZoomPDF);
    fontSmallerBtn.addEventListener('click', decreaseFontSize);
    fontLargerBtn.addEventListener('click', increaseFontSize);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    downloadBtn.addEventListener('click', downloadPDF);
    toggleLog.addEventListener('click', toggleCompilationLog);

    // New layout buttons
    codeFullBtn.addEventListener('click', toggleCodeFull);
    previewFullBtn.addEventListener('click', togglePreviewFull);
    splitViewBtn.addEventListener('click', toggleSplitView);

    fileList.addEventListener('click', handleFileClick);
    editorTabs.addEventListener('click', handleTabClick);
    editor.on('change', handleEditorChange);
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Branch switching
    document.querySelectorAll('.branch-item').forEach(item => {
        item.addEventListener('click', () => {
            const branch = item.dataset.branch;
            switchBranch(branch);
        });
    });
}

// Setup resizable panels
function setupResizablePanels() {
    resizer.addEventListener('mousedown', function (e) {
        if (currentLayout !== 'split') return;

        isResizing = true;
        lastDownX = e.clientX;
        resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });

    // Touch support for mobile
    resizer.addEventListener('touchstart', function (e) {
        if (currentLayout !== 'split') return;

        isResizing = true;
        lastDownX = e.touches[0].clientX;
        resizer.classList.add('resizing');
        document.body.style.userSelect = 'none';

        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
    });
}

function handleMouseMove(e) {
    if (!isResizing) return;

    const containerWidth = document.querySelector('.editor-container').offsetWidth;
    const deltaX = e.clientX - lastDownX;
    const deltaPercent = (deltaX / containerWidth) * 100;

    codePanelWidth = Math.max(20, Math.min(80, codePanelWidth + deltaPercent));
    previewPanelWidth = 100 - codePanelWidth;

    updatePanelSizes();
    lastDownX = e.clientX;
}

function handleMouseUp() {
    if (!isResizing) return;

    isResizing = false;
    resizer.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
}

function handleTouchMove(e) {
    if (!isResizing || !e.touches[0]) return;

    const containerWidth = document.querySelector('.editor-container').offsetWidth;
    const deltaX = e.touches[0].clientX - lastDownX;
    const deltaPercent = (deltaX / containerWidth) * 100;

    codePanelWidth = Math.max(20, Math.min(80, codePanelWidth + deltaPercent));
    previewPanelWidth = 100 - codePanelWidth;

    updatePanelSizes();
    lastDownX = e.touches[0].clientX;
}

function handleTouchEnd() {
    if (!isResizing) return;

    isResizing = false;
    resizer.classList.remove('resizing');
    document.body.style.userSelect = '';

    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
}

function updatePanelSizes() {
    codePanel.style.width = `${codePanelWidth}%`;
    previewPanel.style.width = `${previewPanelWidth}%`;
}

// Layout management functions
function toggleCodeFull() {
    if (currentLayout === 'code-full') {
        // Switch back to split view
        setLayout('split');
    } else {
        // Switch to code full view
        setLayout('code-full');
    }
}

function togglePreviewFull() {
    if (currentLayout === 'preview-full') {
        // Switch back to split view
        setLayout('split');
    } else {
        // Switch to preview full view
        setLayout('preview-full');
    }
}

function toggleSplitView() {
    setLayout('split');
}

function setLayout(layout) {
    // Remove all layout classes
    editorContainer.classList.remove('layout-split', 'layout-code-full', 'layout-preview-full');

    // Add new layout class
    editorContainer.classList.add(`layout-${layout}`);
    currentLayout = layout;

    // Update button visibility
    updateLayoutButtons();

    // Update layout indicator
    updateLayoutIndicator();

    // Refresh editor if needed
    if (editor) {
        setTimeout(() => editor.refresh(), 100);
    }

    // Show notification
    const layoutNames = {
        'split': 'Split View',
        'code-full': 'Full Editor',
        'preview-full': 'Full Preview'
    };
    showNotification(`Switched to ${layoutNames[layout]}`, 'info');
}

function updateLayoutButtons() {
    if (currentLayout === 'split') {
        codeFullBtn.style.display = 'flex';
        previewFullBtn.style.display = 'flex';
        splitViewBtn.style.display = 'none';
        codeFullBtn.innerHTML = '<i class="fas fa-expand"></i>';
        previewFullBtn.innerHTML = '<i class="fas fa-expand"></i>';
    } else if (currentLayout === 'code-full') {
        codeFullBtn.style.display = 'flex';
        previewFullBtn.style.display = 'none';
        splitViewBtn.style.display = 'flex';
        codeFullBtn.innerHTML = '<i class="fas fa-columns"></i>';
        splitViewBtn.innerHTML = '<i class="fas fa-columns"></i>';
    } else if (currentLayout === 'preview-full') {
        codeFullBtn.style.display = 'none';
        previewFullBtn.style.display = 'flex';
        splitViewBtn.style.display = 'flex';
        previewFullBtn.innerHTML = '<i class="fas fa-columns"></i>';
        splitViewBtn.innerHTML = '<i class="fas fa-columns"></i>';
    }
}

function updateLayoutIndicator() {
    const layoutNames = {
        'split': 'Split View',
        'code-full': 'Full Editor',
        'preview-full': 'Full Preview'
    };
    layoutIndicator.textContent = layoutNames[currentLayout];
}

// Compile LaTeX project
async function compileProject() {
    if (isCompiling) return;

    isCompiling = true;
    compileBtn.classList.add('btn-compiling');
    compileText.textContent = 'Compiling...';
    compileBtn.disabled = true;

    statusMessage.textContent = 'Compiling LaTeX...';
    addToLog('Starting compilation...', 'info');

    try {
        const source = editor.getValue();

        // Show compilation in progress
        pdfContainer.innerHTML = `
                <div class="pdf-placeholder">
                    <div class="loading" style="width: 40px; height: 40px; margin-bottom: 15px;"></div>
                    <p>Compiling LaTeX document...</p>
                </div>
            `;

        // Simulate compilation delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Render LaTeX
        await renderLatexToPreview(source);

        showNotification('Compilation successful!', 'success');
        statusMessage.textContent = 'Compilation complete';
        addToLog('Compilation successful!', 'success');

    } catch (error) {
        console.error('Compilation error:', error);
        showPDFError(error.message);
        showNotification(`Compilation failed: ${error.message}`, 'error');
        statusMessage.textContent = 'Compilation failed';
        addToLog(`Compilation error: ${error.message}`, 'error');
    } finally {
        isCompiling = false;
        compileBtn.classList.remove('btn-compiling');
        compileText.textContent = 'Compile';
        compileBtn.disabled = false;
    }
}

// Render Latex to Preview
async function renderLatexToPreview(sourceCode) {
    pdfContainer.innerHTML = '';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'pdf-frame';
    iframe.id = 'pdfFrame';

    pdfContainer.appendChild(iframe);
    pdfFrame = iframe;

    try {
        const generator = new latexjs.HtmlGenerator({ hyphenate: false });
        const doc = latexjs.parse(sourceCode, { generator: generator });

        const head = `
                <head>
                    <meta charset="UTF-8">
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/latex.js/dist/latex.min.css">
                    <style>
                        body { 
                            margin: 40px; 
                            overflow-y: auto;
                            background: white;
                            font-family: "Latin Modern", serif;
                        }
                        @page { margin: 0; }
                    </style>
                </head>
            `;

        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(head);
        iframeDoc.write('<body>');
        iframeDoc.write('</body>');
        iframeDoc.close();

        iframeDoc.body.appendChild(generator.domFragment());
        applyZoom();

    } catch (e) {
        throw new Error(e.message);
    }
}

// Zoom controls
function zoomOutPDF() {
    currentZoom = Math.max(0.25, currentZoom - 0.1);
    applyZoom();
    updateZoomDisplay();
}

function zoomInPDF() {
    currentZoom = Math.min(3.0, currentZoom + 0.1);
    applyZoom();
    updateZoomDisplay();
}

function resetZoomPDF() {
    currentZoom = 1.0;
    applyZoom();
    updateZoomDisplay();
}

function applyZoom() {
    if (pdfFrame) {
        pdfFrame.style.transform = `scale(${currentZoom})`;
        pdfFrame.style.transformOrigin = 'top center';
        pdfFrame.style.width = `${100 / currentZoom}%`;
        pdfFrame.style.height = `${100 / currentZoom}%`;
    }
}

function updateZoomDisplay() {
    zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`;
}

// Editor font size controls
function decreaseFontSize() {
    editorFontSize = Math.max(10, editorFontSize - 1);
    editor.getWrapperElement().style.fontSize = `${editorFontSize}px`;
    editor.refresh();
    updateFontSizeDisplay();
}

function increaseFontSize() {
    editorFontSize = Math.min(24, editorFontSize + 1);
    editor.getWrapperElement().style.fontSize = `${editorFontSize}px`;
    editor.refresh();
    updateFontSizeDisplay();
}

function updateFontSizeDisplay() {
    fontSizeDisplay.textContent = `${editorFontSize}px`;
}

// File management
function openFile(fileName) {
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.file-item[data-file="${fileName}"]`).classList.add('active');

    if (!openTabs.includes(fileName)) {
        openTabs.push(fileName);
        addTab(fileName);
    }

    switchToTab(fileName);
}

function addTab(fileName) {
    const tab = document.createElement('div');
    tab.className = 'editor-tab';
    tab.setAttribute('data-file', fileName);

    const icon = getFileIcon(fileName);
    const name = fileName.split('/').pop();

    tab.innerHTML = `
            ${icon} ${name}
            <span class="editor-tab-close"><i class="fas fa-times"></i></span>
        `;

    editorTabs.appendChild(tab);
    editorTabs.querySelector('.editor-tab.active')?.classList.remove('active');
    tab.classList.add('active');
}

function switchToTab(fileName) {
    document.querySelectorAll('.editor-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`.editor-tab[data-file="${fileName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    currentFile = fileName;
    currentFileElement.textContent = fileName;

    if (fileContents[fileName]) {
        editor.setValue(fileContents[fileName]);
    } else {
        // For new files, create empty content
        fileContents[fileName] = '';
        editHistory[fileName] = [''];
        editHistoryIndex[fileName] = 0;
        editor.setValue('');
    }

    updateSaveStatus(true);
    updateUndoRedoButtons();
}

function closeTab(fileName) {
    if (openTabs.length <= 1) return;

    const tabIndex = openTabs.indexOf(fileName);
    openTabs.splice(tabIndex, 1);

    const tabElement = document.querySelector(`.editor-tab[data-file="${fileName}"]`);
    tabElement.remove();

    if (currentFile === fileName) {
        const newActiveTab = openTabs[Math.max(0, tabIndex - 1)];
        switchToTab(newActiveTab);
    }
}

// Event handlers
function handleFileClick(e) {
    const fileItem = e.target.closest('.file-item');
    const folderItem = e.target.closest('.folder-item');

    if (fileItem) {
        const fileName = fileItem.getAttribute('data-file');
        openFile(fileName);
    } else if (folderItem) {
        folderItem.classList.toggle('expanded');
    }
}

function handleTabClick(e) {
    const tab = e.target.closest('.editor-tab');
    const closeBtn = e.target.closest('.editor-tab-close');

    if (closeBtn && tab) {
        const fileName = tab.getAttribute('data-file');
        if (fileName) {
            closeTab(fileName);
            e.stopPropagation();
        }
    } else if (tab) {
        const fileName = tab.getAttribute('data-file');
        if (fileName) {
            switchToTab(fileName);
        }
    }
}

function handleEditorChange() {
    if (!currentFile) return;

    const content = editor.getValue();
    fileContents[currentFile] = content;

    if (editHistory[currentFile][editHistoryIndex[currentFile]] !== content) {
        editHistoryIndex[currentFile]++;
        editHistory[currentFile][editHistoryIndex[currentFile]] = content;

        if (editHistoryIndex[currentFile] < editHistory[currentFile].length - 1) {
            editHistory[currentFile] = editHistory[currentFile].slice(0, editHistoryIndex[currentFile] + 1);
        }

        if (editHistory[currentFile].length > 50) {
            editHistory[currentFile].shift();
            editHistoryIndex[currentFile]--;
        }
    }

    updateSaveStatus(false);
    updateUndoRedoButtons();
}

function handleKeyboardShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        compileProject();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        toggleCodeFull();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        togglePreviewFull();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        toggleSplitView();
    }
}

// Other functions
function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
        case 'tex': return '<i class="fas fa-file-code"></i>';
        case 'bib': return '<i class="fas fa-file-alt"></i>';
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif': return '<i class="fas fa-file-image"></i>';
        case 'pdf': return '<i class="fas fa-file-pdf"></i>';
        default: return '<i class="fas fa-file"></i>';
    }
}

function reloadPDF() {
    if (fileContents[currentFile]) {
        compileProject();
    }
}

function saveFile() {
    if (!currentFile) return;

    showNotification(`Saved: ${currentFile}`, 'success');
    updateSaveStatus(true);
    addToLog(`Saved ${currentFile}`, 'info');
}

function downloadPDF() {
    showNotification('PDF download simulated', 'info');
    // In a real implementation, this would generate and download a PDF
}

function undoEdit() {
    if (!currentFile || editHistoryIndex[currentFile] <= 0) return;

    editHistoryIndex[currentFile]--;
    const content = editHistory[currentFile][editHistoryIndex[currentFile]];
    editor.setValue(content);
    fileContents[currentFile] = content;
    updateUndoRedoButtons();
    showNotification('Undo', 'info');
}

function redoEdit() {
    if (!currentFile || editHistoryIndex[currentFile] >= editHistory[currentFile].length - 1) return;

    editHistoryIndex[currentFile]++;
    const content = editHistory[currentFile][editHistoryIndex[currentFile]];
    editor.setValue(content);
    fileContents[currentFile] = content;
    updateUndoRedoButtons();
    showNotification('Redo', 'info');
}

function updateUndoRedoButtons() {
    if (!currentFile) {
        undoBtn.disabled = true;
        redoBtn.disabled = true;
        return;
    }

    undoBtn.disabled = editHistoryIndex[currentFile] <= 0;
    redoBtn.disabled = editHistoryIndex[currentFile] >= editHistory[currentFile].length - 1;
}

function showWordCount() {
    const content = editor.getValue();
    const words = content.split(/\s+/).filter(word => word.length > 0).length;
    const characters = content.length;
    showNotification(`Words: ${words}, Characters: ${characters}`, 'info');
}

function toggleFullscreen() {
    if (!pdfFrame) return;

    if (!document.fullscreenElement) {
        if (pdfFrame.requestFullscreen) {
            pdfFrame.requestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

function toggleBranchDropdown(e) {
    e.stopPropagation();
    branchDropdown.classList.toggle('show');
}

function closeBranchDropdown(e) {
    if (!branchDropdown.contains(e.target) && e.target !== branchDropdownBtn) {
        branchDropdown.classList.remove('show');
    }
}

function switchBranch(branchName) {
    currentBranch = branchName;
    currentBranchDisplay.textContent = branchName;
    branchDropdown.classList.remove('show');

    // Update UI
    document.querySelectorAll('.branch-item').forEach(item => {
        item.classList.remove('active');
        item.querySelector('i.fa-check')?.remove();
    });

    const activeItem = document.querySelector(`.branch-item[data-branch="${branchName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
        activeItem.innerHTML += '<i class="fas fa-check"></i>';
    }

    showNotification(`Switched to branch: ${branchName}`, 'info');
}

function toggleCompilationLog() {
    const isVisible = compilationLog.style.display !== 'none';
    compilationLog.style.display = isVisible ? 'none' : 'block';
    toggleLog.innerHTML = isVisible ?
        '<i class="fas fa-chevron-down"></i>' :
        '<i class="fas fa-chevron-up"></i>';
}

function addToLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    logContent.appendChild(logEntry);
    logContent.scrollTop = logContent.scrollHeight;
}

function updateSaveStatus(saved) {
    if (saved) {
        saveStatus.className = 'fas fa-check';
        saveStatus.style.color = 'var(--secondary-color)';
        saveStatusText.textContent = 'All changes saved';
    } else {
        saveStatus.className = 'fas fa-circle';
        saveStatus.style.color = 'var(--warning-color)';
        saveStatusText.textContent = 'Unsaved changes';
    }
}

function updateConnectionStatus(connected) {
    if (connected) {
        connectionStatus.style.color = 'var(--secondary-color)';
    } else {
        connectionStatus.style.color = 'var(--danger-color)';
    }
}

function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = 'notification';
    notification.classList.add(type);
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function showPDFError(message) {
    pdfContainer.innerHTML = '';
    const pdfError = document.createElement('div');
    pdfError.className = 'pdf-error';
    pdfError.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Compilation Error</h3>
            <p>${message}</p>
            <button class="btn btn-secondary" onclick="compileProject()" style="margin-top: 20px;">
                <i class="fas fa-redo"></i> Try Again
            </button>
        `;
    pdfContainer.appendChild(pdfError);
}