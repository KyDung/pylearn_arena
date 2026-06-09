// @ts-nocheck
import * as Phaser from "phaser";
import { isPyodideTimeout, withPyodideTimeout } from "@/lib/pyodideTimeout";
import {
  buildCodeEditorStyles,
  buildCodeEditorHTML,
  initCodeEditor,
  setupCodeFullscreen,
} from "@/lib/codeEditor";
import {
  buildGameMetadataStyles,
  renderGameMetadata,
} from "@/lib/gameMetadata";
import { setupContestSubmission } from "@/lib/contestIntegration";

// ============================================================
// GAME PATH - THAY ĐỔI THEO ĐƯỜNG DẪN GAME
// ============================================================
// Format: "[course]/[topic]/[lesson]/[game-id]"
// Ví dụ: "python-basics/chapter-1/t10-cd-b12/id1"
const GAME_PATH = "CHANGE_ME";

// ============================================================
// CẤU HÌNH GAME TYPE 2 - CODERUNNER STYLE
// ============================================================

const GAME_CONFIG = {
  // Tiêu đề và mô tả
  title: "Tiêu đề game của bạn",
  description: `
    Mô tả chi tiết về game này.
    - Yêu cầu: Viết code để xử lý input và print kết quả
    - Sử dụng input() để đọc dữ liệu
    - Sử dụng print() để xuất kết quả
  `,

  // Test cases với input và expected output
  // Mỗi test case = 1 scene trong game
  // Dùng "\n" để phân tách nhiều lần gọi input() trong 1 test case
  // Ví dụ: input = "5\n10" → input() lần 1 = "5", input() lần 2 = "10"
  // Hãy dùng Generate Tests trong Content Manager để tự động tạo test cases
  ioExamples: [{ input: "5\n10", output: "15" }],

  testCases: [
    {
      input: "", // Nhập dữ liệu stdin (dùng \n giữa các lần gọi input())
      expected: "", // Kết quả mong đợi
      description: "Test case 1",
      sceneText: "Level 1",
    },
  ],

  // Code Python mẫu cho học sinh (sử dụng input() và print())
  starterCode: `# Đọc input
a = int(input())
b = int(input())

# Xử lý và print kết quả
result = a + b
print(result)`,

  // Assets cho từng scene (optional)
  // Path format: /[course]/[topic]/[lesson]/[game]/scene1.png
  // Example: /python-basics/chapter-1/t10-cd-b12/id1/scene1.png
  sceneAssets: [
    { background: "/game-id/scene1.png" },
    { background: "/game-id/scene2.png" },
    { background: "/game-id/scene3.png" },
  ],

  // Phaser config
  phaser: {
    width: 720,
    height: 520,
    backgroundColor: "#121425",
  },
};

// ============================================================
// LAYOUT WITH TEST CASE TABLE
// ============================================================

const buildLayout = () => `
  <style>
    ${buildCodeEditorStyles()}
    ${buildGameMetadataStyles()}
    
    .lesson-header { margin-bottom: 1rem; }
    .lesson-header h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #1f2937; }
    .lesson-header p { color: #4b5563; line-height: 1.6; white-space: pre-line; font-size: 0.875rem; }
    .lesson-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .lesson-game { display: flex; flex-direction: column; }
    .game-card { background: white; border-radius: 0.75rem; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .phaser-frame { 
      background: #121425; 
      border-radius: 0.5rem; 
      overflow: hidden; 
      aspect-ratio: 720/520; 
      width: 100%; 
      max-width: 100%;
      height: auto;
      position: relative;
    }
    .phaser-frame canvas {
      width: 100% !important;
      height: auto !important;
      max-width: 100%;
      display: block;
    }
    .game-status { margin-top: 0.75rem; text-align: center; color: #6b7280; font-size: 0.8rem; }
    .scene-progress { margin-top: 0.25rem; text-align: center; font-weight: 600; color: #3b82f6; font-size: 0.9rem; }
    .lesson-side { display: flex; flex-direction: column; gap: 0.75rem; }
    .lesson-panel { background: white; border-radius: 0.75rem; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .code-panel { padding: 0; overflow: hidden; }
    .output-panel { 
      font-family: 'JetBrains Mono', 'Fira Code', monospace; 
      font-size: 0.75rem; 
      color: #374151; 
      max-height: 150px; 
      overflow-y: auto; 
      white-space: pre-wrap; 
      word-break: break-word;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .output-panel:empty::before {
      content: '📋 Output sẽ hiển thị ở đây...';
      color: #94a3b8;
      font-style: italic;
    }
    
    /* Test Case Table */
    .testcase-table { margin-top: 1rem; display: none; }
    .testcase-table.visible { display: block; }
    .testcase-table h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; color: #1f2937; }
    .testcase-table table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    .testcase-table th, .testcase-table td { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; text-align: left; }
    .testcase-table th { background: #f1f5f9; font-weight: 600; color: #475569; }
    .testcase-table .pass { color: #10b981; font-weight: 600; }
    .testcase-table .fail { color: #ef4444; font-weight: 600; }
    .testcase-table .input, .testcase-table .output { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; white-space: pre-wrap; }
    
    /* Floating Next Scene Button - Always visible at bottom right */
    .next-scene-btn { 
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 14px 36px; 
      font-size: 16px; 
      font-weight: 600; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      border: none; 
      border-radius: 50px; 
      cursor: pointer; 
      display: none;
      transition: all 0.3s ease;
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
      z-index: 1000;
      animation: pulse 2s infinite;
    }
    .next-scene-btn:hover { 
      transform: scale(1.05);
      box-shadow: 0 12px 24px rgba(102, 126, 234, 0.6);
    }
    .next-scene-btn:active { 
      transform: scale(0.98); 
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4); }
      50% { box-shadow: 0 8px 24px rgba(102, 126, 234, 0.7), 0 0 20px rgba(102, 126, 234, 0.3); }
    }
    
    /* Responsive Design */
    @media (max-width: 1024px) { 
      .lesson-layout { grid-template-columns: 1fr; }
      .lesson-header h2 { font-size: 1.25rem; }
      .lesson-header p { font-size: 0.8rem; }
      .game-card { padding: 0.75rem; }
      .lesson-panel { padding: 0.75rem; }
      .output-panel { max-height: 120px; font-size: 0.7rem; }
      .testcase-table { font-size: 0.75rem; }
      .testcase-table th, .testcase-table td { padding: 0.4rem 0.5rem; }
      .next-scene-btn { 
        padding: 12px 28px; 
        font-size: 15px;
        bottom: 20px;
        right: 20px;
      }
    }
    
    @media (max-width: 640px) {
      .lesson-header h2 { font-size: 1.1rem; }
      .lesson-header p { font-size: 0.75rem; }
      .game-card { padding: 0.5rem; }
      .lesson-panel { padding: 0.5rem; }
      .output-panel { max-height: 100px; font-size: 0.65rem; }
      .testcase-table { font-size: 0.7rem; }
      .testcase-table th, .testcase-table td { padding: 0.3rem 0.4rem; }
      .next-scene-btn { 
        padding: 10px 20px; 
        font-size: 13px;
        bottom: 16px;
        right: 16px;
        border-radius: 40px;
      }
      .game-status { font-size: 0.7rem; }
      .scene-progress { font-size: 0.8rem; }
    }
  </style>
  <div class="lesson-header">
    <h2>${GAME_CONFIG.title}</h2>
    ${renderGameMetadata(GAME_CONFIG.description, GAME_CONFIG.ioExamples)}
  </div>
  <div class="lesson-layout">
    <div class="lesson-game">
      <div class="game-card">
        <div id="phaser-root" class="phaser-frame"></div>
        <p class="game-status" id="status">Đang tải Pyodide...</p>
        <p class="scene-progress" id="scene-progress"></p>
      </div>
      
      <!-- Test Case Table -->
      <div class="lesson-panel testcase-table" id="testcase-table">
        <h3>📊 Kết quả Test Cases</h3>
        <table>
          <thead>
            <tr>
              <th>Scene</th>
              <th>Input</th>
              <th>Expected</th>
              <th>Your Output</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody id="testcase-body"></tbody>
        </table>
      </div>
    </div>
    <aside class="lesson-side">
      <div class="lesson-panel code-panel">
        ${buildCodeEditorHTML(GAME_CONFIG.starterCode, "Python Code")}
        <div class="code-actions" style="padding: 12px;">
          <button class="primary" id="submit-code">▶ Chạy Code</button>
          <button class="code-toggle" type="button">⛶ Phóng to</button>
        </div>
      </div>
      <div class="lesson-panel output-panel" id="output"></div>
    </aside>
  </div>
  
  <!-- Floating Next Scene Button (outside layout for fixed positioning) -->
  <button class="next-scene-btn" id="next-scene-btn" style="display: none;">🚀 Next Scene ➜</button>
`;

// ============================================================
// GAME LOGIC - CODERUNNER STYLE
// ============================================================

export default function initGame(
  root: HTMLElement,
  { pyodide }: { pyodide: any },
) {
  root.innerHTML = buildLayout();

  const status = root.querySelector("#status") as HTMLElement;
  const sceneProgress = root.querySelector("#scene-progress") as HTMLElement;
  const output = root.querySelector("#output") as HTMLElement;
  const submitButton = root.querySelector("#submit-code") as HTMLButtonElement;
  const testcaseTable = root.querySelector("#testcase-table") as HTMLElement;
  const testcaseBody = root.querySelector("#testcase-body") as HTMLElement;
  const nextSceneBtn = root.querySelector(
    "#next-scene-btn",
  ) as HTMLButtonElement;

  // Initialize enhanced code editor
  const codeEditor = initCodeEditor(root, GAME_CONFIG.starterCode);
  setupCodeFullscreen(root);

  let phaserGame: Phaser.Game | null = null;
  let currentScene = 0;
  let testResults: any[] = [];
  let currentSceneInstance: any = null;
  let displayText: Phaser.GameObjects.Text | null = null;
  let sceneText: Phaser.GameObjects.Text | null = null;
  let correctSound: Phaser.Sound.BaseSound | null = null;
  let wrongSound: Phaser.Sound.BaseSound | null = null;

  // Hàm load scene content
  const loadSceneContent = (scene: any, sceneIndex: number) => {
    scene.children.removeAll();

    const bgKey = `BG${sceneIndex}`;
    if (scene.textures.exists(bgKey)) {
      const bg = scene.add.image(0, 0, bgKey).setOrigin(0);
      bg.displayWidth = scene.scale.gameSize.width;
      bg.displayHeight = scene.scale.gameSize.height;
    }

    sceneText = scene.add.text(
      360,
      100,
      GAME_CONFIG.testCases[sceneIndex]?.sceneText || `Level ${sceneIndex + 1}`,
      {
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: "32px",
        color: "#ffffff",
        align: "center",
      },
    );
    sceneText.setOrigin(0.5);

    displayText = scene.add.text(360, 260, "Chờ kết quả...", {
      fontFamily: "Space Grotesk, sans-serif",
      fontSize: "24px",
      color: "#ffffff",
      align: "center",
    });
    displayText.setOrigin(0.5);
  };

  // Event listener cho nút Next Scene
  nextSceneBtn.addEventListener("click", () => {
    nextSceneBtn.style.display = "none";
    currentScene++;
    updateSceneProgress();

    // Chuyển sang scene Phaser tiếp theo
    if (currentSceneInstance && phaserGame) {
      const nextSceneKey = `GameScene${currentScene}`;
      currentSceneInstance.scene.start(nextSceneKey);
    }

    runTestForScene(currentScene);
  });

  const logLine = (text: string) => {
    const line = document.createElement("div");
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  };

  const resetOutput = () => {
    output.textContent = "";
  };

  const updateSceneProgress = () => {
    sceneProgress.textContent = `Scene ${currentScene + 1}/${GAME_CONFIG.testCases.length}`;
  };

  const updateTestCaseTable = () => {
    testcaseBody.innerHTML = "";
    testResults.forEach((result, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>Scene ${index + 1}</td>
        <td class="input">${result.input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
        <td class="input">${result.expected}</td>
        <td class="output">${result.actual}</td>
        <td class="${result.passed ? "pass" : "fail"}">${result.passed ? "✓ Pass" : "✗ Fail"}</td>
      `;
      testcaseBody.appendChild(row);
    });
  };

  // ============================================================
  // PHASER MULTI-SCENE GAME - TRUE SCENE SWITCHING
  // ============================================================

  // Base Scene class for each level
  class GameScene extends Phaser.Scene {
    private sceneIndex: number;
    private displayText: any;
    private sceneText: any;

    constructor(sceneIndex: number) {
      super({ key: `GameScene${sceneIndex}` });
      this.sceneIndex = sceneIndex;
    }

    create() {
      // Safety check for Phaser APIs
      if (!this.add || !this.tweens || !this.cameras) {
        console.error("Phaser APIs not ready in create()");
        return;
      }

      currentSceneInstance = this;

      // Load background if exists
      const bgKey = `BG${this.sceneIndex}`;
      if (this.textures.exists(bgKey)) {
        const bg = this.add.image(0, 0, bgKey).setOrigin(0);
        bg.displayWidth = this.scale.gameSize.width;
        bg.displayHeight = this.scale.gameSize.height;
      }

      // Scene title
      this.sceneText = this.add.text(
        360,
        100,
        GAME_CONFIG.testCases[this.sceneIndex]?.sceneText ||
          `Level ${this.sceneIndex + 1}`,
        {
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: "32px",
          color: "#ffffff",
          align: "center",
        },
      );
      this.sceneText.setOrigin(0.5);

      // Result display
      this.displayText = this.add.text(360, 260, "Chờ kết quả...", {
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: "24px",
        color: "#ffffff",
        align: "center",
      });
      this.displayText.setOrigin(0.5);

      displayText = this.displayText;
      sceneText = this.sceneText;
    }

    showResult(passed: boolean) {
      this.displayText.setText(passed ? "✓ PASS" : "✗ FAIL");
      this.displayText.setColor(passed ? "#00ff00" : "#ff0000");

      if (passed) {
        correctSound && correctSound.play();
      } else {
        wrongSound && wrongSound.play();
      }
    }
  }

  // Preload Scene - load all assets once
  class PreloadScene extends Phaser.Scene {
    constructor() {
      super({ key: "PreloadScene" });
    }

    preload() {
      // Load assets for all scenes
      GAME_CONFIG.sceneAssets?.forEach((asset, index) => {
        if (asset.background) {
          this.load.image(`BG${index}`, asset.background);
        }
      });
      this.load.audio("correct", "/sound_global/correct.mp3");
      this.load.audio("wrong", "/sound_global/wrong.mp3");
    }

    create() {
      // Initialize sounds with proper AudioContext state checking
      try {
        if (this.sound && this.sound.context) {
          const audioContext = this.sound.context;

          // Only initialize sounds if AudioContext is not closed
          if (audioContext.state !== "closed") {
            correctSound = this.sound.add("correct");
            wrongSound = this.sound.add("wrong");

            // Resume AudioContext if suspended
            if (audioContext.state === "suspended") {
              audioContext.resume().catch((err: Error) => {
                console.warn("AudioContext resume failed:", err);
              });
            }
          } else {
            console.warn(
              "AudioContext is closed, skipping sound initialization",
            );
          }
        }
      } catch (error) {
        console.warn("Sound initialization failed:", error);
      }

      // Start first game scene
      this.scene.start("GameScene0");
    }
  }

  const startPhaser = () => {
    // Cleanup old game instance
    if (phaserGame) {
      try {
        phaserGame.destroy(true);
      } catch (error) {
        console.warn("Error destroying old game:", error);
      }
      phaserGame = null;
    }

    // Reset global state and sound references
    currentScene = 0;
    testResults = [];
    currentSceneInstance = null;
    correctSound = null;
    wrongSound = null;
    updateSceneProgress();

    // Create scene instances for all test cases
    const sceneClasses = [PreloadScene];
    for (let i = 0; i < GAME_CONFIG.testCases.length; i++) {
      sceneClasses.push(new GameScene(i));
    }

    phaserGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: "phaser-root",
      width: GAME_CONFIG.phaser.width,
      height: GAME_CONFIG.phaser.height,
      backgroundColor: GAME_CONFIG.phaser.backgroundColor,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: sceneClasses,
    });

    return {
      showResult: (sceneIndex: number, result: any) => {
        if (!currentSceneInstance || !phaserGame) return;

        const passed = result.passed;

        // Call the scene's showResult method
        if (currentSceneInstance.showResult) {
          currentSceneInstance.showResult(passed);
        }

        // Show Next button or final results
        setTimeout(() => {
          if (sceneIndex < GAME_CONFIG.testCases.length - 1) {
            // Còn scene tiếp theo - hiển thị nút Next
            nextSceneBtn.style.display = "block";

            // Auto-scroll to game canvas for better UX
            const phaserRoot = document.getElementById("phaser-root");
            if (phaserRoot) {
              phaserRoot.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          } else {
            // Đã hết scenes - hiển thị kết quả
            status.textContent = testResults.every((r) => r.passed)
              ? "🎉 Hoàn thành tất cả scenes!"
              : "❌ Một số test cases sai";
            testcaseTable.classList.add("visible");
          }
        }, 1500);
      },
    };
  };

  let ui = startPhaser();

  // ============================================================
  // PYTHON CODE VALIDATION - CODERUNNER STYLE
  // ============================================================

  // Helper function: Wait for Phaser scene to be fully initialized
  const waitForSceneReady = (maxRetries = 20): Promise<void> => {
    return new Promise((resolve, reject) => {
      let retries = 0;

      const checkReady = () => {
        // Check if scene instance exists and has all required APIs
        if (
          currentSceneInstance &&
          currentSceneInstance.add &&
          currentSceneInstance.tweens &&
          currentSceneInstance.cameras
        ) {
          console.log("Scene is ready!");
          resolve();
          return;
        }

        retries++;
        if (retries >= maxRetries) {
          console.error("Timeout waiting for scene to be ready");
          reject(new Error("Scene initialization timeout"));
          return;
        }

        // Retry after 50ms
        setTimeout(checkReady, 50);
      };

      checkReady();
    });
  };

  const runTestForScene = (sceneIndex: number) => {
    const testCase = GAME_CONFIG.testCases[sceneIndex];

    // Safety check
    if (!testCase) {
      console.error(
        `Test case ${sceneIndex} not found. Available: ${GAME_CONFIG.testCases.length}`,
      );
      status.textContent = `Error: Test case ${sceneIndex + 1} not found`;
      return;
    }

    try {
      // Setup input/output mock using Python-level override (same as generate-tests for consistency)
      const inputLines = testCase.input
        ? testCase.input.split("\n")
        : [];

      pyodide.runPython(`
import sys
from io import StringIO
_input_lines = ${JSON.stringify(inputLines)}
_input_idx = [0]
def input(prompt=""):
    idx = _input_idx[0]
    _input_idx[0] += 1
    return _input_lines[idx] if idx < len(_input_lines) else ""
_captured_output = StringIO()
sys.stdout = _captured_output
`);

      // Run student code
      if (!codeEditor) return;
      const code = codeEditor.getCode();
      withPyodideTimeout(pyodide, () => {
        pyodide.runPython(code);
      });

      // Get captured output
      const capturedOutput = pyodide.runPython(`_captured_output.getvalue()`);

      // Restore stdout and remove input mock
      pyodide.runPython(`
sys.stdout = sys.__stdout__
del input
`);

      // Compare output
      const actualOutput = capturedOutput.trim();
      const expectedOutput = testCase.expected.trim();
      const passed = actualOutput === expectedOutput;

      testResults[sceneIndex] = {
        input: testCase.input,
        expected: expectedOutput,
        actual: actualOutput,
        passed: passed,
        description: testCase.description,
      };

      updateTestCaseTable();
      ui.showResult(sceneIndex, testResults[sceneIndex]);

      logLine(
        `Scene ${sceneIndex + 1}: ${passed ? "✓ Pass" : "✗ Fail"} - ${testCase.description}`,
      );
      if (actualOutput) {
        actualOutput.split("\n").filter(Boolean).forEach((line) =>
          logLine(`  📤 Log: ${line}`),
        );
      }
      if (!passed) {
        logLine(`  Expected: "${expectedOutput}"`);
        logLine(`  Got:      "${actualOutput || "(no output)"}"`);
      }
    } catch (error) {
      testResults[sceneIndex] = {
        input: testCase?.input || "N/A",
        expected: testCase?.expected || "N/A",
        actual: String(error),
        passed: false,
        description: testCase?.description || `Test ${sceneIndex + 1}`,
      };
      ui.showResult(sceneIndex, testResults[sceneIndex]);
      logLine(`Scene ${sceneIndex + 1}: ✗ Error - ${error}`);
    }
  };

  if (!pyodide) {
    status.textContent = "Pyodide chưa sẵn sàng.";
    submitButton.disabled = true;
  } else {
    status.textContent = "Pyodide sẵn sàng. Submit code để bắt đầu.";
    pyodide.setStdout({
      batched: (text: string) => {
        logLine(text);
      },
    });
  }

  submitButton.addEventListener("click", async () => {
    resetOutput();
    testResults = [];
    currentScene = 0;
    testcaseTable.classList.remove("visible");
    status.textContent = "Đang khởi tạo game...";
    updateSceneProgress();

    // Restart Phaser game
    ui = startPhaser();

    // Wait for scene to be fully initialized
    try {
      await waitForSceneReady();
      status.textContent = "Đang chấm bài và chạy game...";
    } catch (error) {
      status.textContent = "Lỗi khởi tạo game. Vui lòng thử lại.";
      logLine("❌ Game initialization failed. Please refresh and try again.");
      console.error(error);
      return;
    }

    try {
      // Start from scene 0
      runTestForScene(0);
    } catch (error) {
      if (isPyodideTimeout(error)) {
        status.textContent = "Code chạy quá lâu. Hãy kiểm tra vòng lặp.";
      } else {
        status.textContent = "Có lỗi trong code.";
      }
      logLine(String(error));
    }
  });

  // ============================================================
  // CONTEST INTEGRATION - Tích hợp cuộc thi
  // ============================================================
  // Tự động kiểm tra game có đang trong cuộc thi không
  // Nếu có, hiển thị nút "Nộp code cuộc thi"

  const getScore = () => {
    const passed = testResults.filter((r) => r.passed).length;
    const total = GAME_CONFIG.testCases.length;
    return Math.round((passed / total) * 100);
  };

  const getTestResults = () => {
    const passed = testResults.filter((r) => r.passed).length;
    const total = GAME_CONFIG.testCases.length;
    return { passed, total };
  };

  // Setup contest - nếu GAME_PATH đúng, sẽ tự hiển thị nút nộp bài
  if (GAME_PATH !== "CHANGE_ME") {
    setupContestSubmission(root, GAME_PATH, {
      getCode: () => codeInput.value,
      getScore: getScore,
      getTestResults: getTestResults,
      onSubmitted: (result) => {
        if (result.success) {
          logLine("🏆 Đã nộp bài cuộc thi thành công!");
        } else {
          logLine(`❌ Lỗi nộp bài: ${result.error}`);
        }
      },
    });
  }

  // ============================================================
  // EXPOSE GAME INSTANCE FOR SESSION SUBMISSION
  // ============================================================
  // Session system cần gameInstance để lấy kết quả test
  (window as any).gameInstance = {
    getTestResults: getTestResults,
    getScore: getScore,
    getCode: () => codeInput?.value || "",
  };
}
