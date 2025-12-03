// app.js (fixed) - robust write/read for SwiftLaTeX + ensure editor content saved before compile
// Keeps lazy-load behavior and latex.js fallback; improves FS writes (Uint8Array) and files packaging.

let currentBranch = 'main';
let currentFile = 'main.tex';
let fileContents = {};
let openTabs = ['main.tex'];
let isCompiling = false;
let editor;
let editHistory = {};
let editHistoryIndex = {};
let pdfFrame = null;
let currentZoom = 1.0;
let editorFontSize = 14;
let isResizing = false;
let lastDownX = 0;
let codePanelWidth = 50;
let previewPanelWidth = 50;
let currentLayout = 'split';

// SwiftLaTeX lazy-load & state
let swiftScriptLoaded = false;
let latexEngine = null;
let latexEngineLoaded = false;
const SWIFTLATEX_SCRIPT_SRC = 'https://www.swiftlatex.com/ide/js/fastlatex/PdfTeXEngine.js';
const SWIFTLATEX_WASM_URL = 'https://www.swiftlatex.com/ide/js/fastlatex/cpdfetex.wasm';

// DOM shortcuts (same IDs as your HTML)
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

// TextEncoder for UTF-8 bytes
const textEncoder = new TextEncoder();

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupResizablePanels();
    updateLayoutIndicator();
    showNotification('Welcome to Collab-Tex!', 'info');
});

function initializeApp() {
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
            "Cmd-Y": redoEdit,
            "Tab": "indentMore",
            "Shift-Tab": "indentLess",
            "Ctrl-E": toggleCodeFull,
            "Ctrl-P": togglePreviewFull,
            "Ctrl-Space": toggleSplitView
        }
    });

    const initialContent = `\\documentclass{article}
\\usepackage{graphicx}
\\usepackage{amsmath}
\\title{Welcome to Collab-Tex}
\\author{Your Name}
\\date{\\today}

\\begin{document}
\\maketitle

Hello world.

\\end{document}`;
    editor.setValue(initialContent);
    fileContents['main.tex'] = initialContent;
    editHistory['main.tex'] = [initialContent];
    editHistoryIndex['main.tex'] = 0;

    updateSaveStatus(true);
    updateConnectionStatus(true);
    updateFontSizeDisplay();
}

// ---------- Events ----------
function setupEventListeners() {
    branchDropdownBtn?.addEventListener('click', toggleBranchDropdown);
    document.addEventListener('click', closeBranchDropdown);

    compileBtn?.addEventListener('click', compileProject);
    reloadBtn?.addEventListener('click', reloadPDF);
    saveBtn?.addEventListener('click', saveFile);
    undoBtn?.addEventListener('click', undoEdit);
    redoBtn?.addEventListener('click', redoEdit);
    wordCountBtn?.addEventListener('click', showWordCount);
    zoomOutBtn?.addEventListener('click', zoomOutPDF);
    zoomInBtn?.addEventListener('click', zoomInPDF);
    zoomResetBtn?.addEventListener('click', resetZoomPDF);
    fontSmallerBtn?.addEventListener('click', decreaseFontSize);
    fontLargerBtn?.addEventListener('click', increaseFontSize);
    fullscreenBtn?.addEventListener('click', toggleFullscreen);
    downloadBtn?.addEventListener('click', downloadPDF);
    if (toggleLog) toggleLog.addEventListener('click', toggleCompilationLog);

    codeFullBtn?.addEventListener('click', toggleCodeFull);
    previewFullBtn?.addEventListener('click', togglePreviewFull);
    splitViewBtn?.addEventListener('click', toggleSplitView);

    fileList?.addEventListener('click', handleFileClick);
    editorTabs?.addEventListener('click', handleTabClick);
    editor.on('change', handleEditorChange);
    document.addEventListener('keydown', handleKeyboardShortcuts);

    document.querySelectorAll('.branch-item').forEach(item => item.addEventListener('click', () => switchBranch(item.dataset.branch)));
}

// ---------- Resizer (unchanged) ----------
function setupResizablePanels() {
    resizer?.addEventListener('mousedown', function (e) {
        if (currentLayout !== 'split') return;
        isResizing = true;
        lastDownX = e.clientX;
        resizer.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });
    resizer?.addEventListener('touchstart', function (e) {
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
    const containerWidth = editorContainer.offsetWidth;
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
    const containerWidth = editorContainer.offsetWidth;
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
    if (codePanel) codePanel.style.width = `${codePanelWidth}%`;
    if (previewPanel) previewPanel.style.width = `${previewPanelWidth}%`;
}

// ---------- Layout (unchanged except small guard) ----------
function toggleCodeFull() { currentLayout === 'code-full' ? setLayout('split') : setLayout('code-full'); }
function togglePreviewFull() { currentLayout === 'preview-full' ? setLayout('split') : setLayout('preview-full'); }
function toggleSplitView() { setLayout('split'); }
function setLayout(layout) {
    editorContainer.classList.remove('layout-split', 'layout-code-full', 'layout-preview-full');
    editorContainer.classList.add(`layout-${layout}`);
    currentLayout = layout;
    updateLayoutButtons();
    updateLayoutIndicator();
    if (editor) setTimeout(() => editor.refresh(), 120);
    showNotification({ 'split': 'Switched to Split View', 'code-full': 'Switched to Full Editor', 'preview-full': 'Switched to Full Preview' }[layout], 'info');
}
function updateLayoutButtons() {
    if (!codeFullBtn || !previewFullBtn || !splitViewBtn) return;
    if (currentLayout === 'split') {
        codeFullBtn.style.display = 'flex';
        previewFullBtn.style.display = 'flex';
        splitViewBtn.style.display = 'none';
    } else if (currentLayout === 'code-full') {
        codeFullBtn.style.display = 'flex';
        previewFullBtn.style.display = 'none';
        splitViewBtn.style.display = 'flex';
    } else {
        codeFullBtn.style.display = 'none';
        previewFullBtn.style.display = 'flex';
        splitViewBtn.style.display = 'flex';
    }
}
function updateLayoutIndicator() {
    layoutIndicator.textContent = { 'split': 'Split View', 'code-full': 'Full Editor', 'preview-full': 'Full Preview' }[currentLayout];
}

// ---------- Lazy-load SwiftLaTeX helpers ----------
async function lazyLoadSwiftScript() {
    if (swiftScriptLoaded) return;
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = SWIFTLATEX_SCRIPT_SRC;
        s.async = true;
        s.onload = () => { swiftScriptLoaded = true; addToLog('SwiftLaTeX loader script loaded.', 'info'); resolve(); };
        s.onerror = (e) => { addToLog('Failed to load SwiftLaTeX script.', 'error'); reject(e); };
        document.head.appendChild(s);
    });
}
async function tryInitSwiftLaTeX() {
    if (typeof window.LaTeXEngine === 'undefined') {
        addToLog('SwiftLaTeX loader not exposing LaTeXEngine; fallback to latex.js.', 'warning');
        latexEngineLoaded = false;
        return;
    }
    try {
        addToLog('Initializing SwiftLaTeX engine...', 'info');
        latexEngine = new LaTeXEngine();
        if (typeof latexEngine.loadEngine === 'function') {
            await latexEngine.loadEngine({ wasmUrl: SWIFTLATEX_WASM_URL });
        } else if (typeof latexEngine.init === 'function') {
            await latexEngine.init({ wasmUrl: SWIFTLATEX_WASM_URL });
        }
        latexEngineLoaded = true;
        addToLog('SwiftLaTeX engine initialized.', 'success');
    } catch (err) {
        latexEngineLoaded = false;
        addToLog('SwiftLaTeX initialization failed: ' + (err.message || err), 'error');
        console.warn('Swift init:', err);
    }
}

// ---------- CORE: compileProject (ensures fileContents updated + writes bytes properly) ----------
async function compileProject() {
    if (isCompiling) return;
    isCompiling = true;
    compileBtn.classList.add('btn-compiling');
    compileText.textContent = 'Compiling...';
    compileBtn.disabled = true;
    statusMessage.textContent = 'Compiling LaTeX...';
    addToLog('Starting compilation...', 'info');

    try {
        // Important: ensure the editor value is saved to fileContents BEFORE packaging files
        const currentSource = editor.getValue();
        fileContents[currentFile] = currentSource;

        // Prepare files map for engine and fallback (include references.bib if present)
        const files = {};
        files['main.tex'] = fileContents['main.tex'] || currentSource || '';
        if (fileContents['references.bib']) files['references.bib'] = fileContents['references.bib'];

        // show placeholder
        if (!pdfContainer.querySelector('.pdf-frame')) {
            pdfContainer.innerHTML = `
                <div class="pdf-placeholder">
                    <div style="width:40px;height:40px;margin-bottom:12px;border:3px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin 1s linear infinite;"></div>
                    <p>Compiling LaTeX document...</p>
                </div>`;
        } else {
            // overlay
            const overlay = document.createElement('div');
            overlay.className = 'pdf-placeholder';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.right = '0';
            overlay.style.bottom = '0';
            overlay.style.background = 'rgba(255,255,255,0.8)';
            overlay.style.zIndex = '50';
            overlay.innerHTML = `<div style="margin:auto;text-align:center;"><div style="width:36px;height:36px;margin-bottom:10px;border:3px solid rgba(0,0,0,.1);border-top-color:#000;border-radius:50%;animation:spin 1s linear infinite;"></div><p>Compiling...</p></div>`;
            pdfContainer.appendChild(overlay);
        }

        // Lazy load engine if needed
        if (!swiftScriptLoaded) {
            try { await lazyLoadSwiftScript(); await tryInitSwiftLaTeX(); }
            catch (e) { addToLog('SwiftLaTeX not available; will use latex.js fallback.', 'warning'); }
        }

        // If engine available try real PDF build
        if (latexEngineLoaded && latexEngine) {
            try {
                await compileWithSwiftLaTeXFiles(files);
                showNotification('Compilation successful (WASM PDF)!', 'success');
                statusMessage.textContent = 'Compilation complete (WASM)';
                addToLog('Compilation successful (WASM)', 'success');
                return;
            } catch (err) {
                addToLog('Swift compile error: ' + (err.message || err), 'error');
                console.warn('Swift compile:', err);
                // fallthrough to fallback
            }
        }

        // fallback to latex.js HTML DOM render
        await renderLatexToPreview(files['main.tex']);
        showNotification('Rendered with HTML fallback (latex.js)', 'success');
        statusMessage.textContent = 'Rendered (HTML)';
        addToLog('Rendered with latex.js', 'info');

    } catch (error) {
        console.error('Compilation error:', error);
        showPDFError(error.message || error);
        showNotification(`Compilation failed: ${error.message || error}`, 'error');
        statusMessage.textContent = 'Compilation failed';
        addToLog(`Compilation error: ${error.message || error}`, 'error');
    } finally {
        isCompiling = false;
        compileBtn.classList.remove('btn-compiling');
        compileText.textContent = 'Compile';
        compileBtn.disabled = false;
        // remove overlays (keep iframe if present)
        const overlays = pdfContainer.querySelectorAll('.pdf-placeholder');
        overlays.forEach(o => {
            if (!pdfContainer.querySelector('.pdf-frame')) pdfContainer.innerHTML = o.outerHTML;
            else o.remove();
        });
    }
}

// ---------- write files to engine FS robustly (accepts files map of name->string) ----------
async function compileWithSwiftLaTeXFiles(filesMap) {
    if (!latexEngine || !latexEngineLoaded) throw new Error('SwiftLaTeX engine not loaded');

    // Convert strings to Uint8Array UTF-8 bytes (TextEncoder)
    const fileEntries = Object.entries(filesMap);

    // Try several methods to write files to engine FS
    for (const [name, content] of fileEntries) {
        const dataBytes = textEncoder.encode(content);

        try {
            // preferred: engine.writeMemFSFile(name, Uint8Array)
            if (typeof latexEngine.writeMemFSFile === 'function') {
                latexEngine.writeMemFSFile(name, dataBytes);
                addToLog(`Wrote ${name} via writeMemFSFile()`, 'info');
                continue;
            }

            // emscripten style: FS.writeFile('/name', data, { encoding: 'binary' })
            if (latexEngine.FS && typeof latexEngine.FS.writeFile === 'function') {
                try {
                    // Some FS implementations accept Uint8Array directly
                    latexEngine.FS.writeFile('/' + name, dataBytes, { encoding: 'binary' });
                } catch (e) {
                    // fallback: try without options
                    latexEngine.FS.writeFile('/' + name, dataBytes);
                }
                addToLog(`Wrote ${name} via FS.writeFile()`, 'info');
                continue;
            }

            // generic writeFile API
            if (typeof latexEngine.writeFile === 'function') {
                latexEngine.writeFile(name, dataBytes);
                addToLog(`Wrote ${name} via writeFile()`, 'info');
                continue;
            }

            // last resort: if engine exposes MEMFS raw, try to create file via Emscripten
            throw new Error('No supported write API found on engine');

        } catch (werr) {
            addToLog(`Failed to write ${name} to engine FS: ${werr.message || werr}`, 'warning');
            // continue attempting other files; compilation may still fail and fallback will be used
        }
    }

    // Now invoke compile command; handle multiple possible APIs
    let result = null;
    if (typeof latexEngine.compile === 'function') {
        result = await latexEngine.compile('main.tex');
    } else if (typeof latexEngine.run === 'function') {
        // some runtimes accept args array
        result = await latexEngine.run(['pdflatex', 'main.tex']);
    } else if (typeof latexEngine.exec === 'function') {
        result = await latexEngine.exec('pdflatex main.tex');
    } else if (typeof latexEngine.build === 'function') {
        result = await latexEngine.build();
    } else {
        throw new Error('No supported compile API on SwiftLaTeX engine');
    }

    // try to locate PDF bytes
    let pdfBytes = null;

    // common patterns
    if (result) {
        if (result.pdf) pdfBytes = result.pdf;
        else if (result.files && result.files['main.pdf']) pdfBytes = result.files['main.pdf'];
        else if (result instanceof Uint8Array || result instanceof ArrayBuffer) pdfBytes = result;
    }

    // fallback: try FS.readFile
    if (!pdfBytes && latexEngine.FS && typeof latexEngine.FS.readFile === 'function') {
        try {
            const data = latexEngine.FS.readFile('/main.pdf');
            pdfBytes = data.buffer ? data.buffer : data;
        } catch (e) {
            addToLog('FS.readFile(/main.pdf) failed: ' + (e.message || e), 'warning');
        }
    }

    if (!pdfBytes) {
        // helpful error: try to capture stdout or log files if available
        let stdout = null;
        try { if (result && result.stdout) stdout = result.stdout; } catch (e) { }
        throw new Error('Compilation finished but no PDF found. Engine stdout: ' + (stdout || 'none'));
    }

    if (pdfBytes instanceof ArrayBuffer) pdfBytes = new Uint8Array(pdfBytes);
    if (!(pdfBytes instanceof Uint8Array)) {
        try { pdfBytes = new Uint8Array(pdfBytes); } catch (e) { /* not convertible */ }
    }

    // create blob and show
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    let iframe = pdfContainer.querySelector('.pdf-frame');
    if (!iframe) {
        pdfContainer.innerHTML = '';
        iframe = document.createElement('iframe');
        iframe.className = 'pdf-frame';
        pdfContainer.appendChild(iframe);
    }
    iframe.src = url;
    pdfFrame = iframe;
    applyZoom();
}

// ---------- latex.js fallback (unchanged) ----------
async function renderLatexToPreview(sourceCode) {
    let iframe = pdfContainer.querySelector('.pdf-frame');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.className = 'pdf-frame';
        pdfContainer.innerHTML = '';
        pdfContainer.appendChild(iframe);
    }
    pdfFrame = iframe;

    try {
        const generator = new latexjs.HtmlGenerator({ hyphenate: false });
        latexjs.parse(sourceCode, { generator: generator });

        const head = `<head><meta charset="utf-8"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/latex.js/dist/latex.min.css"><style>body{margin:24px;background:white;font-family:"Latin Modern",serif;color:#111}</style></head>`;
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(head);
        doc.write('<body></body>');
        doc.close();
        doc.body.appendChild(generator.domFragment());
        applyZoom();
    } catch (e) {
        throw new Error(e.message || e);
    }
}

// ---------- Zoom / Editor helpers (unchanged) ----------
function zoomOutPDF() { currentZoom = Math.max(0.25, currentZoom - 0.1); applyZoom(); updateZoomDisplay(); }
function zoomInPDF() { currentZoom = Math.min(3.0, currentZoom + 0.1); applyZoom(); updateZoomDisplay(); }
function resetZoomPDF() { currentZoom = 1.0; applyZoom(); updateZoomDisplay(); }
function applyZoom() {
    if (!pdfFrame) return;
    pdfFrame.style.transform = `scale(${currentZoom})`;
    pdfFrame.style.transformOrigin = 'top center';
    pdfFrame.style.width = `${100 / currentZoom}%`;
    pdfFrame.style.height = `${100 / currentZoom}%`;
}
function updateZoomDisplay() { zoomDisplay.textContent = `${Math.round(currentZoom * 100)}%`; }
function decreaseFontSize() { editorFontSize = Math.max(10, editorFontSize - 1); editor.getWrapperElement().style.fontSize = `${editorFontSize}px`; editor.refresh(); updateFontSizeDisplay(); }
function increaseFontSize() { editorFontSize = Math.min(24, editorFontSize + 1); editor.getWrapperElement().style.fontSize = `${editorFontSize}px`; editor.refresh(); updateFontSizeDisplay(); }
function updateFontSizeDisplay() { fontSizeDisplay.textContent = `${editorFontSize}px`; }

// ---------- Files / Tabs / Undo / Redo (unchanged) ----------
function openFile(fileName) { document.querySelectorAll('.file-item').forEach(item => item.classList.remove('active')); document.querySelector(`.file-item[data-file="${fileName}"]`)?.classList.add('active'); if (!openTabs.includes(fileName)) { openTabs.push(fileName); addTab(fileName); } switchToTab(fileName); }
function addTab(fileName) { const tab = document.createElement('div'); tab.className = 'editor-tab'; tab.setAttribute('data-file', fileName); const name = fileName.split('/').pop(); tab.innerHTML = `<i class="fas fa-file-code"></i> ${name}<span class="editor-tab-close"><i class="fas fa-times"></i></span>`; editorTabs.appendChild(tab); editorTabs.querySelector('.editor-tab.active')?.classList.remove('active'); tab.classList.add('active'); }
function switchToTab(fileName) { document.querySelectorAll('.editor-tab').forEach(tab => tab.classList.remove('active')); document.querySelector(`.editor-tab[data-file="${fileName}"]`)?.classList.add('active'); currentFile = fileName; currentFileElement.textContent = fileName; if (fileContents[fileName]) editor.setValue(fileContents[fileName]); else { fileContents[fileName] = ''; editHistory[fileName] = ['']; editHistoryIndex[fileName] = 0; editor.setValue(''); } updateSaveStatus(true); updateUndoRedoButtons(); }
function closeTab(fileName) { if (openTabs.length <= 1) return; const idx = openTabs.indexOf(fileName); openTabs.splice(idx, 1); document.querySelector(`.editor-tab[data-file="${fileName}"]`)?.remove(); if (currentFile === fileName) switchToTab(openTabs[Math.max(0, idx - 1)]); }
function handleFileClick(e) { const fileItem = e.target.closest('.file-item'); const folderItem = e.target.closest('.folder-item'); if (fileItem) openFile(fileItem.getAttribute('data-file')); else if (folderItem) folderItem.classList.toggle('expanded'); }
function handleTabClick(e) { const tab = e.target.closest('.editor-tab'); const closeBtn = e.target.closest('.editor-tab-close'); if (closeBtn && tab) { closeTab(tab.getAttribute('data-file')); e.stopPropagation(); } else if (tab) switchToTab(tab.getAttribute('data-file')); }

function handleEditorChange() {
    if (!currentFile) return;
    const content = editor.getValue();
    fileContents[currentFile] = content;
    if (!editHistory[currentFile]) { editHistory[currentFile] = [content]; editHistoryIndex[currentFile] = 0; }
    if (editHistory[currentFile][editHistoryIndex[currentFile]] !== content) {
        editHistoryIndex[currentFile]++; editHistory[currentFile][editHistoryIndex[currentFile]] = content;
        if (editHistoryIndex[currentFile] < editHistory[currentFile].length - 1) editHistory[currentFile] = editHistory[currentFile].slice(0, editHistoryIndex[currentFile] + 1);
        if (editHistory[currentFile].length > 50) { editHistory[currentFile].shift(); editHistoryIndex[currentFile]--; }
    }
    updateSaveStatus(false);
    updateUndoRedoButtons();
}

function handleKeyboardShortcuts(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveFile(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); compileProject(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); toggleCodeFull(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); togglePreviewFull(); }
}

// ---------- Other helpers ----------
function reloadPDF() { if (fileContents[currentFile]) compileProject(); }
function saveFile() { if (!currentFile) return; fileContents[currentFile] = editor.getValue(); showNotification(`Saved: ${currentFile}`, 'success'); updateSaveStatus(true); addToLog(`Saved ${currentFile}`, 'info'); }
function downloadPDF() { try { if (pdfFrame && pdfFrame.src && pdfFrame.src.startsWith('blob:')) { const a = document.createElement('a'); a.href = pdfFrame.src; a.download = (currentFile || 'document') + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); showNotification('Download started', 'info'); return; } } catch (e) { } showNotification('PDF download simulated', 'info'); }
function undoEdit() { if (!currentFile || editHistoryIndex[currentFile] <= 0) return; editHistoryIndex[currentFile]--; editor.setValue(editHistory[currentFile][editHistoryIndex[currentFile]]); fileContents[currentFile] = editor.getValue(); updateUndoRedoButtons(); showNotification('Undo', 'info'); }
function redoEdit() { if (!currentFile || editHistoryIndex[currentFile] >= editHistory[currentFile].length - 1) return; editHistoryIndex[currentFile]++; editor.setValue(editHistory[currentFile][editHistoryIndex[currentFile]]); fileContents[currentFile] = editor.getValue(); updateUndoRedoButtons(); showNotification('Redo', 'info'); }
function updateUndoRedoButtons() { if (!currentFile) { undoBtn.disabled = true; redoBtn.disabled = true; return; } undoBtn.disabled = editHistoryIndex[currentFile] <= 0; redoBtn.disabled = editHistoryIndex[currentFile] >= editHistory[currentFile].length - 1; }

// ---------- UI helpers ----------
function showWordCount() { const content = editor.getValue(); const words = content.split(/\s+/).filter(w => w.length > 0).length; showNotification(`Words: ${words}`, 'info'); }
function toggleFullscreen() { if (!pdfFrame) return; if (!document.fullscreenElement) pdfFrame.requestFullscreen?.(); else document.exitFullscreen?.(); }
function toggleBranchDropdown(e) { e.stopPropagation(); branchDropdown.classList.toggle('show'); }
function closeBranchDropdown(e) { if (!branchDropdown.contains(e.target) && e.target !== branchDropdownBtn) branchDropdown.classList.remove('show'); }
function switchBranch(name) { currentBranch = name; currentBranchDisplay.textContent = name; branchDropdown.classList.remove('show'); document.querySelectorAll('.branch-item').forEach(it => { it.classList.remove('active'); it.querySelector('i.fa-check')?.remove(); }); const act = document.querySelector(`.branch-item[data-branch="${name}"]`); if (act) { act.classList.add('active'); act.innerHTML += '<i class="fas fa-check"></i>'; } showNotification(`Switched to ${name}`, 'info'); }
function toggleCompilationLog() { const visible = compilationLog.style.display !== 'block'; compilationLog.style.display = visible ? 'block' : 'none'; toggleLog.innerHTML = visible ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>'; }
function addToLog(message, type = 'info') { const ts = new Date().toLocaleTimeString(); const e = document.createElement('div'); e.className = `log-${type}`; e.textContent = `[${ts}] ${message}`; logContent.appendChild(e); logContent.scrollTop = logContent.scrollHeight; }
function updateSaveStatus(saved) { if (saved) { saveStatus.className = 'fas fa-check'; saveStatus.style.color = 'var(--secondary-color)'; saveStatusText.textContent = 'All changes saved'; } else { saveStatus.className = 'fas fa-circle'; saveStatus.style.color = 'var(--warning-color)'; saveStatusText.textContent = 'Unsaved changes'; } }
function updateConnectionStatus(connected) { connectionStatus.style.color = connected ? 'var(--secondary-color)' : 'var(--danger-color)'; }
function showNotification(message, type = 'info') { notification.textContent = message; notification.className = 'notification'; notification.classList.add('show'); setTimeout(() => notification.classList.remove('show'), 2500); }
function showPDFError(message) { pdfContainer.innerHTML = ''; const d = document.createElement('div'); d.className = 'pdf-error'; d.innerHTML = `<i class="fas fa-exclamation-triangle"></i><h3>Compilation Error</h3><p>${message}</p><button class="btn btn-secondary" id="tryAgainButton" style="margin-top:20px"><i class="fas fa-redo"></i> Try Again</button>`; pdfContainer.appendChild(d); document.getElementById('tryAgainButton')?.addEventListener('click', compileProject); }
