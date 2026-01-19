// ============================================================
// PYTHON CODE EDITOR - Enhanced with syntax highlighting
// ============================================================

export interface CodeEditorOptions {
  initialCode: string;
  onSubmit?: (code: string) => void;
  placeholder?: string;
}

// Python keywords for syntax highlighting
const PYTHON_KEYWORDS = [
  "def",
  "class",
  "if",
  "elif",
  "else",
  "for",
  "while",
  "try",
  "except",
  "finally",
  "with",
  "as",
  "import",
  "from",
  "return",
  "yield",
  "break",
  "continue",
  "pass",
  "raise",
  "global",
  "nonlocal",
  "lambda",
  "and",
  "or",
  "not",
  "in",
  "is",
  "True",
  "False",
  "None",
  "async",
  "await",
  "assert",
  "del",
  "print",
  "input",
  "len",
  "range",
  "int",
  "str",
  "float",
  "list",
  "dict",
  "set",
  "tuple",
  "bool",
  "type",
  "isinstance",
  "open",
  "self",
];

// Build the code editor HTML and CSS
export const buildCodeEditorStyles = () => `
  /* Code Editor Container */
  .code-editor-container {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    background: #1e1e2e;
    border: 1px solid #313244;
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
  }
  
  /* Editor Header */
  .code-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #181825;
    border-bottom: 1px solid #313244;
  }
  
  .code-editor-title {
    color: #cdd6f4;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .code-editor-title::before {
    content: '🐍';
    font-size: 14px;
  }
  
  .code-editor-actions {
    display: flex;
    gap: 6px;
  }
  
  .editor-action-btn {
    background: #313244;
    border: none;
    color: #a6adc8;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    transition: all 0.2s;
  }
  
  .editor-action-btn:hover {
    background: #45475a;
    color: #cdd6f4;
  }
  
  /* Main Editor Area */
  .code-editor-wrapper {
    display: flex;
    position: relative;
    min-height: 280px;
    max-height: 500px;
  }
  
  .code-panel.fullscreen .code-editor-wrapper {
    flex: 1;
    max-height: none;
    min-height: 0;
  }
  
  /* Line Numbers */
  .line-numbers {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 45px;
    background: #181825;
    color: #6c7086;
    font-size: 13px;
    line-height: 1.6;
    padding: 12px 8px;
    text-align: right;
    user-select: none;
    overflow: hidden;
    border-right: 1px solid #313244;
    z-index: 1;
  }
  
  .line-numbers div {
    height: 20.8px;
  }
  
  .line-numbers div.active {
    color: #f9e2af;
    font-weight: 600;
  }
  
  /* Syntax Highlighted Display */
  .code-display {
    position: absolute;
    left: 45px;
    top: 0;
    right: 0;
    bottom: 0;
    padding: 12px;
    font-size: 13px;
    line-height: 1.6;
    color: #cdd6f4;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: auto;
    pointer-events: none;
    z-index: 1;
    tab-size: 4;
  }
  
  /* Hidden Textarea for actual input */
  .code-input {
    position: absolute;
    left: 45px;
    top: 0;
    right: 0;
    bottom: 0;
    width: calc(100% - 45px);
    height: 100%;
    padding: 12px;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.6;
    color: transparent;
    caret-color: #f5e0dc;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    overflow: auto;
    z-index: 2;
    tab-size: 4;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  
  .code-input::placeholder {
    color: #6c7086;
  }
  
  .code-input::selection {
    background: rgba(137, 180, 250, 0.3);
  }
  
  /* Syntax Highlighting Colors */
  .syntax-keyword { color: #cba6f7; font-weight: 500; }
  .syntax-string { color: #a6e3a1; }
  .syntax-number { color: #fab387; }
  .syntax-comment { color: #6c7086; font-style: italic; }
  .syntax-function { color: #89b4fa; }
  .syntax-class { color: #f9e2af; }
  .syntax-operator { color: #89dceb; }
  .syntax-bracket { color: #f5c2e7; }
  .syntax-builtin { color: #94e2d5; }
  .syntax-decorator { color: #f38ba8; }
  .syntax-self { color: #f38ba8; font-style: italic; }
  
  /* Code Actions */
  .code-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  
  .code-actions button {
    padding: 10px 20px;
    border-radius: 6px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    font-size: 14px;
  }
  
  .code-actions button.primary {
    background: linear-gradient(135deg, #89b4fa 0%, #74c7ec 100%);
    color: #1e1e2e;
  }
  
  .code-actions button.primary:hover {
    background: linear-gradient(135deg, #74c7ec 0%, #89dceb 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(137, 180, 250, 0.4);
  }
  
  .code-actions button.primary:disabled {
    background: #45475a;
    color: #6c7086;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  
  .code-toggle {
    background: #313244;
    color: #cdd6f4;
  }
  
  .code-toggle:hover {
    background: #45475a;
  }
  
  /* Fullscreen Mode */
  .code-panel.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    margin: 0;
    border-radius: 0;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    background: #1e1e2e;
  }
  
  .code-panel.fullscreen .code-editor-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    border-radius: 0;
    border: none;
  }
  
  .code-panel.fullscreen .code-editor-wrapper {
    flex: 1;
    min-height: 0;
    max-height: none;
  }
  
  body.no-scroll {
    overflow: hidden;
  }
  
  /* Minimap indicator (visual only) */
  .code-minimap {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 60px;
    background: rgba(24, 24, 37, 0.8);
    border-left: 1px solid #313244;
    display: none;
  }
  
  .code-panel.fullscreen .code-minimap {
    display: block;
  }
  
  /* Status bar */
  .code-statusbar {
    display: flex;
    justify-content: space-between;
    padding: 4px 12px;
    background: #181825;
    border-top: 1px solid #313244;
    font-size: 11px;
    color: #6c7086;
  }
  
  .code-statusbar-left, .code-statusbar-right {
    display: flex;
    gap: 16px;
  }
  
  .statusbar-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  /* Cursor blink animation */
  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
`;

// Syntax highlighting function
export const highlightPython = (code: string): string => {
  // Escape HTML first
  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Store string and comments to protect them
  const protected_strings: string[] = [];
  let protectIdx = 0;

  // Protect triple-quoted strings first
  html = html.replace(/('''[\s\S]*?'''|"""[\s\S]*?""")/g, (match) => {
    protected_strings.push(`<span class="syntax-string">${match}</span>`);
    return `__PROTECTED_${protectIdx++}__`;
  });

  // Protect single-line strings
  html = html.replace(
    /("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g,
    (match) => {
      protected_strings.push(`<span class="syntax-string">${match}</span>`);
      return `__PROTECTED_${protectIdx++}__`;
    },
  );

  // Protect comments
  html = html.replace(/(#.*$)/gm, (match) => {
    protected_strings.push(`<span class="syntax-comment">${match}</span>`);
    return `__PROTECTED_${protectIdx++}__`;
  });

  // Decorators
  html = html.replace(/(@\w+)/g, '<span class="syntax-decorator">$1</span>');

  // Function definitions
  html = html.replace(
    /\b(def)\s+(\w+)/g,
    '<span class="syntax-keyword">$1</span> <span class="syntax-function">$2</span>',
  );

  // Class definitions
  html = html.replace(
    /\b(class)\s+(\w+)/g,
    '<span class="syntax-keyword">$1</span> <span class="syntax-class">$2</span>',
  );

  // Self keyword
  html = html.replace(/\b(self)\b/g, '<span class="syntax-self">$1</span>');

  // Keywords
  const keywordPattern = new RegExp(
    `\\b(${PYTHON_KEYWORDS.filter((k) => k !== "self").join("|")})\\b`,
    "g",
  );
  html = html.replace(keywordPattern, '<span class="syntax-keyword">$1</span>');

  // Numbers (int, float, hex, binary, octal)
  html = html.replace(
    /\b(0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d+\.?\d*(?:e[+-]?\d+)?)\b/g,
    '<span class="syntax-number">$1</span>',
  );

  // Operators
  html = html.replace(
    /([+\-*/%=&|^~<>!]+)/g,
    '<span class="syntax-operator">$1</span>',
  );

  // Brackets
  html = html.replace(/([()[\]{}])/g, '<span class="syntax-bracket">$1</span>');

  // Restore protected strings and comments
  for (let i = protected_strings.length - 1; i >= 0; i--) {
    html = html.replace(`__PROTECTED_${i}__`, protected_strings[i]);
  }

  return html;
};

// Calculate current indent level
export const getIndentLevel = (line: string): number => {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
};

// Check if line ends with colon (needs extra indent)
export const shouldIncreaseIndent = (line: string): boolean => {
  const trimmed = line.trim();
  return trimmed.endsWith(":") && !trimmed.startsWith("#");
};

// Build the code editor HTML
export const buildCodeEditorHTML = (
  starterCode: string,
  title: string = "Python Code",
) => `
  <div class="code-editor-container">
    <div class="code-editor-header">
      <span class="code-editor-title">${title}</span>
      <div class="code-editor-actions">
        <button class="editor-action-btn" id="editor-reset" title="Reset code">↺ Reset</button>
        <button class="editor-action-btn" id="editor-copy" title="Copy code">📋 Copy</button>
      </div>
    </div>
    <div class="code-editor-wrapper">
      <div class="line-numbers" id="line-numbers"></div>
      <div class="code-display" id="code-display"></div>
      <textarea 
        id="code-input" 
        class="code-input" 
        spellcheck="false" 
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        data-gramm="false"
        placeholder="# Nhập code Python của bạn ở đây..."
      >${starterCode}</textarea>
    </div>
    <div class="code-statusbar">
      <div class="code-statusbar-left">
        <span class="statusbar-item" id="cursor-position">Ln 1, Col 1</span>
        <span class="statusbar-item" id="char-count">0 chars</span>
      </div>
      <div class="code-statusbar-right">
        <span class="statusbar-item">Python</span>
        <span class="statusbar-item">UTF-8</span>
        <span class="statusbar-item">Spaces: 4</span>
      </div>
    </div>
  </div>
`;

// Initialize code editor functionality
export const initCodeEditor = (root: HTMLElement, starterCode: string) => {
  const codeInput = root.querySelector("#code-input") as HTMLTextAreaElement;
  const codeDisplay = root.querySelector("#code-display") as HTMLElement;
  const lineNumbers = root.querySelector("#line-numbers") as HTMLElement;
  const cursorPosition = root.querySelector("#cursor-position") as HTMLElement;
  const charCount = root.querySelector("#char-count") as HTMLElement;
  const resetBtn = root.querySelector("#editor-reset") as HTMLButtonElement;
  const copyBtn = root.querySelector("#editor-copy") as HTMLButtonElement;

  if (!codeInput || !codeDisplay || !lineNumbers) return null;

  // Update syntax highlighting
  const updateDisplay = () => {
    const code = codeInput.value;
    codeDisplay.innerHTML = highlightPython(code) + "\n"; // Extra newline for last line visibility

    // Update line numbers
    const lines = code.split("\n");
    lineNumbers.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join("");

    // Update char count
    if (charCount) {
      charCount.textContent = `${code.length} chars`;
    }
  };

  // Update cursor position display
  const updateCursorPosition = () => {
    if (!cursorPosition) return;

    const pos = codeInput.selectionStart;
    const text = codeInput.value.substring(0, pos);
    const lines = text.split("\n");
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;

    cursorPosition.textContent = `Ln ${line}, Col ${col}`;

    // Highlight active line number
    const lineNumDivs = lineNumbers.querySelectorAll("div");
    lineNumDivs.forEach((div, i) => {
      div.classList.toggle("active", i === line - 1);
    });
  };

  // Sync scroll between textarea and display
  const syncScroll = () => {
    codeDisplay.scrollTop = codeInput.scrollTop;
    codeDisplay.scrollLeft = codeInput.scrollLeft;
    lineNumbers.scrollTop = codeInput.scrollTop;
  };

  // Handle Tab key for indentation
  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    e.preventDefault();

    const start = codeInput.selectionStart;
    const end = codeInput.selectionEnd;
    const value = codeInput.value;

    if (e.shiftKey) {
      // Shift+Tab: Remove indent
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineContent = value.substring(lineStart, start);
      const spacesToRemove = Math.min(
        4,
        lineContent.length - lineContent.trimStart().length,
      );

      if (
        spacesToRemove > 0 &&
        lineContent.substring(0, spacesToRemove).trim() === ""
      ) {
        codeInput.value =
          value.substring(0, lineStart) +
          value.substring(lineStart + spacesToRemove);
        codeInput.selectionStart = codeInput.selectionEnd =
          start - spacesToRemove;
      }
    } else {
      // Tab: Add indent
      codeInput.value =
        value.substring(0, start) + "    " + value.substring(end);
      codeInput.selectionStart = codeInput.selectionEnd = start + 4;
    }

    updateDisplay();
  };

  // Handle Enter key for auto-indent
  const handleEnter = (e: KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const start = codeInput.selectionStart;
    const value = codeInput.value;

    // Find current line
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = value.indexOf("\n", start);
    const currentLine = value.substring(
      lineStart,
      lineEnd === -1 ? value.length : lineEnd,
    );

    // Calculate indent
    let indent = getIndentLevel(currentLine);

    // Check if line ends with colon
    const textBeforeCursor = value.substring(lineStart, start);
    if (
      shouldIncreaseIndent(
        textBeforeCursor.trim() ? textBeforeCursor : currentLine,
      )
    ) {
      indent += 4;
    }

    // Insert newline with indent
    const newLineContent = "\n" + " ".repeat(indent);
    codeInput.value =
      value.substring(0, start) + newLineContent + value.substring(start);
    codeInput.selectionStart = codeInput.selectionEnd =
      start + newLineContent.length;

    updateDisplay();
    updateCursorPosition();
  };

  // Handle bracket auto-close
  const handleBrackets = (e: KeyboardEvent) => {
    const pairs: Record<string, string> = {
      "(": ")",
      "[": "]",
      "{": "}",
      '"': '"',
      "'": "'",
    };

    const char = e.key;
    if (!pairs[char]) return;

    const start = codeInput.selectionStart;
    const end = codeInput.selectionEnd;
    const value = codeInput.value;

    // If text is selected, wrap it
    if (start !== end) {
      e.preventDefault();
      const selectedText = value.substring(start, end);
      codeInput.value =
        value.substring(0, start) +
        char +
        selectedText +
        pairs[char] +
        value.substring(end);
      codeInput.selectionStart = start + 1;
      codeInput.selectionEnd = end + 1;
      updateDisplay();
    } else if (char === '"' || char === "'") {
      // For quotes, check if we're closing an existing quote
      const nextChar = value[start];
      if (nextChar === char) {
        e.preventDefault();
        codeInput.selectionStart = codeInput.selectionEnd = start + 1;
      } else {
        e.preventDefault();
        codeInput.value =
          value.substring(0, start) +
          char +
          pairs[char] +
          value.substring(start);
        codeInput.selectionStart = codeInput.selectionEnd = start + 1;
        updateDisplay();
      }
    }
  };

  // Handle Backspace for bracket pair deletion
  const handleBackspace = (e: KeyboardEvent) => {
    if (e.key !== "Backspace") return;

    const start = codeInput.selectionStart;
    const value = codeInput.value;

    if (start === 0) return;

    const prevChar = value[start - 1];
    const nextChar = value[start];

    const pairs: Record<string, string> = {
      "(": ")",
      "[": "]",
      "{": "}",
      '"': '"',
      "'": "'",
    };

    if (pairs[prevChar] === nextChar) {
      e.preventDefault();
      codeInput.value =
        value.substring(0, start - 1) + value.substring(start + 1);
      codeInput.selectionStart = codeInput.selectionEnd = start - 1;
      updateDisplay();
    }
  };

  // Handle keyboard shortcuts
  const handleShortcuts = (e: KeyboardEvent) => {
    // Ctrl/Cmd + D: Duplicate line
    if ((e.ctrlKey || e.metaKey) && e.key === "d") {
      e.preventDefault();
      const start = codeInput.selectionStart;
      const value = codeInput.value;

      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      let lineEnd = value.indexOf("\n", start);
      if (lineEnd === -1) lineEnd = value.length;

      const currentLine = value.substring(lineStart, lineEnd);
      codeInput.value =
        value.substring(0, lineEnd) +
        "\n" +
        currentLine +
        value.substring(lineEnd);
      codeInput.selectionStart = codeInput.selectionEnd =
        start + currentLine.length + 1;

      updateDisplay();
    }

    // Ctrl/Cmd + /: Toggle comment
    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      const start = codeInput.selectionStart;
      const value = codeInput.value;

      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      let lineEnd = value.indexOf("\n", start);
      if (lineEnd === -1) lineEnd = value.length;

      const currentLine = value.substring(lineStart, lineEnd);
      const trimmed = currentLine.trimStart();
      const leadingSpaces = currentLine.length - trimmed.length;

      let newLine: string;
      let newCursorPos: number;

      if (trimmed.startsWith("# ")) {
        newLine =
          currentLine.substring(0, leadingSpaces) + trimmed.substring(2);
        newCursorPos = start - 2;
      } else if (trimmed.startsWith("#")) {
        newLine =
          currentLine.substring(0, leadingSpaces) + trimmed.substring(1);
        newCursorPos = start - 1;
      } else {
        newLine = currentLine.substring(0, leadingSpaces) + "# " + trimmed;
        newCursorPos = start + 2;
      }

      codeInput.value =
        value.substring(0, lineStart) + newLine + value.substring(lineEnd);
      codeInput.selectionStart = codeInput.selectionEnd = Math.max(
        lineStart,
        newCursorPos,
      );

      updateDisplay();
    }
  };

  // Event listeners
  codeInput.addEventListener("input", () => {
    updateDisplay();
    updateCursorPosition();
  });

  codeInput.addEventListener("scroll", syncScroll);

  codeInput.addEventListener("keydown", (e) => {
    handleTab(e);
    handleEnter(e);
    handleBrackets(e);
    handleBackspace(e);
    handleShortcuts(e);
  });

  codeInput.addEventListener("click", updateCursorPosition);
  codeInput.addEventListener("keyup", updateCursorPosition);

  // Reset button
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Reset code về ban đầu?")) {
        codeInput.value = starterCode;
        updateDisplay();
        updateCursorPosition();
      }
    });
  }

  // Copy button
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(codeInput.value);
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "✓ Copied!";
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    });
  }

  // Initialize display
  updateDisplay();
  updateCursorPosition();

  // Return the code input element for external access
  return {
    getCode: () => codeInput.value,
    setCode: (code: string) => {
      codeInput.value = code;
      updateDisplay();
      updateCursorPosition();
    },
    element: codeInput,
  };
};

// Fullscreen toggle setup
export const setupCodeFullscreen = (root: HTMLElement) => {
  const panel = root.querySelector(".code-panel");
  const toggle = root.querySelector(".code-toggle");
  if (!panel || !toggle) return;

  const setState = (isFullscreen: boolean) => {
    panel.classList.toggle("fullscreen", isFullscreen);
    document.body.classList.toggle("no-scroll", isFullscreen);
    toggle.textContent = isFullscreen ? "⛶ Thu nhỏ" : "⛶ Phóng to";
  };

  toggle.addEventListener("click", () => {
    setState(!panel.classList.contains("fullscreen"));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("fullscreen")) {
      setState(false);
    }
  });
};
