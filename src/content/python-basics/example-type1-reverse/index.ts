// @ts-nocheck
import * as Phaser from "phaser";
import { isPyodideTimeout, withPyodideTimeout } from "@/lib/pyodideTimeout";
import {
  buildCodeEditorStyles,
  buildCodeEditorHTML,
  initCodeEditor,
  setupCodeFullscreen,
} from "@/lib/codeEditor";

// ============================================================
// VÍ DỤ TYPE 1: ĐẢO NGƯỢC CHUỖI
// ============================================================

const GAME_CONFIG = {
  title: "Type 1 Example: Đảo ngược chuỗi",
  description: ` 
    Viết hàm reverse_string() để đảo ngược một chuỗi.
    - Input: Một chuỗi bất kỳ
    - Output: Chuỗi đã được đảo ngược
    
    Mỗi level là một test case khác nhau!
  `,

  pythonFunction: "reverse_string",

  starterCode: `def reverse_string(text):
    # Viết code ở đây
    
    return result`,

  // 3 test cases = 3 scenes trong game
  testCases: [
    {
      input: "hello",
      expected: "olleh",
      description: "Scene 1: Đảo ngược 'hello'",
      sceneText: "🎮 Level 1: Basic",
    },
    {
      input: "Python",
      expected: "nohtyP",
      description: "Scene 2: Đảo ngược 'Python'",
      sceneText: "🎮 Level 2: Medium",
    },
    {
      input: "12345",
      expected: "54321",
      description: "Scene 3: Đảo ngược số",
      sceneText: "🎮 Level 3: Advanced",
    },
  ],

  sceneAssets: [
    { background: "/example-type1-reverse/scene1.png" },
    { background: "/example-type1-reverse/scene2.png" },
    { background: "/example-type1-reverse/scene3.png" },
  ],

  phaser: {
    width: 720,
    height: 520,
    backgroundColor: "#1a1a2e",
  },
};

// ============================================================
// LAYOUT WITH TEST CASE TABLE
// ============================================================

const buildLayout = () => `
  <style>
    .lesson-header { margin-bottom: 1.5rem; }
    .lesson-header h2 { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.75rem; }
    .lesson-header p { color: #4b5563; line-height: 1.625; white-space: pre-line; }
    .lesson-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
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
    .game-status { margin-top: 0.75rem; text-align: center; color: #6b7280; font-size: 0.875rem; }
    .scene-progress { margin-top: 0.5rem; text-align: center; font-weight: 600; color: #3b82f6; }
    .lesson-side { display: flex; flex-direction: column; gap: 1rem; }
    .lesson-panel { background: white; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .code-panel h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }
    ${buildCodeEditorStyles()}
    .code-actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
    .code-actions button { padding: 0.625rem 1.25rem; border-radius: 0.5rem; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; }
    .code-actions button.primary { background: #3b82f6; color: white; }
    .code-actions button.primary:hover { background: #2563eb; }
    .code-actions button.primary:disabled { background: #9ca3af; cursor: not-allowed; }
    .code-toggle { background: #e5e7eb; color: #374151; }
    .code-toggle:hover { background: #d1d5db; }
    .output-panel { font-family: 'Courier New', monospace; font-size: 0.875rem; color: #374151; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; }
    
    /* Test Case Table */
    .testcase-table { margin-top: 1rem; display: none; }
    .testcase-table.visible { display: block; }
    .testcase-table table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .testcase-table th, .testcase-table td { padding: 0.5rem; border: 1px solid #d1d5db; text-align: left; }
    .testcase-table th { background: #f3f4f6; font-weight: 600; }
    .testcase-table .pass { color: #10b981; font-weight: 600; }
    .testcase-table .fail { color: #ef4444; font-weight: 600; }
    .testcase-table .input, .testcase-table .output { font-family: 'Courier New', monospace; font-size: 0.75rem; }
    
    /* Responsive Design */
    @media (max-width: 1024px) { 
      .lesson-layout { grid-template-columns: 1fr; }
      .lesson-header h2 { font-size: 1.25rem; }
      .lesson-header p { font-size: 0.8rem; }
      .game-card { padding: 0.75rem; }
      .lesson-panel { padding: 0.75rem; }
      .output-panel { max-height: 120px; font-size: 0.7rem; }
      .testcase-table { font-size: 0.75rem; }
      .testcase-table th, .testcase-table td { padding: 0.375rem 0.5rem; }
    }
    
    @media (max-width: 640px) {
      .lesson-header h2 { font-size: 1.1rem; }
      .lesson-header p { font-size: 0.75rem; line-height: 1.4; }
      .game-card { padding: 0.5rem; }
      .lesson-panel { padding: 0.5rem; }
      .output-panel { max-height: 100px; font-size: 0.65rem; }
      .testcase-table { font-size: 0.65rem; }
      .testcase-table th, .testcase-table td { padding: 0.25rem 0.3rem; font-size: 0.6rem; }
      .game-status { font-size: 0.7rem; }
      .scene-progress { font-size: 0.8rem; }
    }
  </style>
  <div class="lesson-header">
    <h2>${GAME_CONFIG.title}</h2>
    <p>${GAME_CONFIG.description}</p>
  </div>
  <div class="lesson-layout">
    <div class="lesson-game">
      <div class="game-card">
        <div id="phaser-root" class="phaser-frame"></div>
        <p class="game-status" id="status">Đang tải Pyodide...</p>
        <p class="scene-progress" id="scene-progress"></p>
      </div>
    </div>
    <aside class="lesson-side">
      <div class="lesson-panel code-panel">
        ${buildCodeEditorHTML(GAME_CONFIG.starterCode, "Python Code")}
        <div class="code-actions">
          <button class="primary" id="submit-code">Submit & Play</button>
          <button class="code-toggle" type="button">Phóng to</button>
        </div>
      </div>
      <div class="lesson-panel output-panel" id="output"></div>
      
      <!-- Test Case Table -->
      <div class="lesson-panel testcase-table" id="testcase-table">
        <h3>Test Cases</h3>
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
    </aside>
  </div>
`;

// ============================================================
// GAME LOGIC - MULTI SCENE
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

  // Initialize enhanced code editor
  const codeEditor = initCodeEditor(root, GAME_CONFIG.starterCode);
  setupCodeFullscreen(root);

  let phaserGame: Phaser.Game | null = null;
  let currentScene = 0;
  let testResults: any[] = [];

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
        <td class="input">${result.input}</td>
        <td class="input">${result.expected}</td>
        <td class="output">${result.actual}</td>
        <td class="${result.passed ? "pass" : "fail"}">${result.passed ? "✓ Pass" : "✗ Fail"}</td>
      `;
      testcaseBody.appendChild(row);
    });
  };

  // ============================================================
  // PHASER MULTI-SCENE GAME
  // ============================================================
  const startPhaser = () => {
    if (phaserGame) {
      phaserGame.destroy(true);
      phaserGame = null;
    }

    currentScene = 0;
    testResults = [];
    updateSceneProgress();

    let displayText: Phaser.GameObjects.Text | null = null;
    let sceneText: Phaser.GameObjects.Text | null = null;
    let correctSound: Phaser.Sound.BaseSound | null = null;
    let wrongSound: Phaser.Sound.BaseSound | null = null;

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
      scene: {
        preload() {
          // Load assets for all scenes
          GAME_CONFIG.sceneAssets?.forEach((asset, index) => {
            if (asset.background) {
              this.load.image(`BG${index}`, asset.background);
            }
          });
          this.load.audio("correct", "/sound_global/correct.mp3");
          this.load.audio("wrong", "/sound_global/wrong.mp3");
        },
        create() {
          try {
            if (this.sound) {
              correctSound = this.sound.add("correct");
              wrongSound = this.sound.add("wrong");
            }
          } catch (error) {
            console.warn("Sound initialization failed:", error);
          }

          this.loadScene(currentScene);
        },
        loadScene(sceneIndex: number) {
          // Clear previous scene
          this.children.removeAll();

          // Background
          const bgKey = `BG${sceneIndex}`;
          if (this.textures.exists(bgKey)) {
            const bg = this.add.image(0, 0, bgKey).setOrigin(0);
            bg.displayWidth = this.scale.gameSize.width;
            bg.displayHeight = this.scale.gameSize.height;
          }

          // Scene label
          sceneText = this.add.text(
            360,
            100,
            GAME_CONFIG.testCases[sceneIndex]?.sceneText ||
              `Level ${sceneIndex + 1}`,
            {
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: "32px",
              color: "#ffffff",
              align: "center",
            },
          );
          sceneText.setOrigin(0.5);

          // Result text
          displayText = this.add.text(360, 260, "Chờ kết quả...", {
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "24px",
            color: "#ffffff",
            align: "center",
          });
          displayText.setOrigin(0.5);
        },
      },
    });

    return {
      showResult: (sceneIndex: number, result: any) => {
        if (!displayText || !phaserGame) return;

        const passed = result.passed;
        displayText.setText(passed ? "✓ PASS" : "✗ FAIL");
        displayText.setColor(passed ? "#00ff00" : "#ff0000");

        if (passed) {
          correctSound && correctSound.play();
        } else {
          wrongSound && wrongSound.play();
        }

        // Auto move to next scene after 1.5s
        setTimeout(() => {
          if (sceneIndex < GAME_CONFIG.testCases.length - 1) {
            currentScene = sceneIndex + 1;
            updateSceneProgress();
            (phaserGame.scene.scenes[0] as any).loadScene(currentScene);

            // Run test for next scene
            runTestForScene(currentScene);
          } else {
            // All scenes completed - show test case table
            status.textContent = testResults.every((r) => r.passed)
              ? "🎉 Hoàn thành tất cả scenes!"
              : "❌ Một số test cases sai";
            testcaseTable.classList.add("visible");
          }
        }, 1500);
      },
    };
  };

  const ui = startPhaser();

  // ============================================================
  // PYTHON CODE VALIDATION
  // ============================================================
  let pythonFunction: any = null;

  const runTestForScene = (sceneIndex: number) => {
    if (!pythonFunction) return;

    const testCase = GAME_CONFIG.testCases[sceneIndex];
    try {
      const resultProxy = withPyodideTimeout(pyodide, () =>
        pythonFunction(testCase.input),
      );
      const result = String(resultProxy);
      if (resultProxy?.destroy) resultProxy.destroy();

      const passed = result === testCase.expected;
      testResults[sceneIndex] = {
        input: testCase.input,
        expected: testCase.expected,
        actual: result,
        passed: passed,
        description: testCase.description,
      };

      updateTestCaseTable();
      ui.showResult(sceneIndex, testResults[sceneIndex]);

      logLine(
        `Scene ${sceneIndex + 1}: ${passed ? "✓ Pass" : "✗ Fail"} - ${testCase.description}`,
      );
    } catch (error) {
      testResults[sceneIndex] = {
        input: testCase.input,
        expected: testCase.expected,
        actual: String(error),
        passed: false,
        description: testCase.description,
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

  submitButton.addEventListener("click", () => {
    resetOutput();
    testResults = [];
    currentScene = 0;
    testcaseTable.classList.remove("visible");
    status.textContent = "Đang chấm bài và chạy game...";
    updateSceneProgress();

    try {
      // Run student code
      withPyodideTimeout(pyodide, () => {
        pyodide.runPython(codeEditor.getCode());
      });

      pythonFunction = pyodide.globals.get(GAME_CONFIG.pythonFunction);
      if (!pythonFunction) {
        status.textContent = `Chưa thấy hàm ${GAME_CONFIG.pythonFunction}()`;
        return;
      }

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
  // EXPOSE GAME INSTANCE FOR SESSION SUBMISSION
  // ============================================================
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

  (window as any).gameInstance = {
    getTestResults: getTestResults,
    getScore: getScore,
    getCode: () => codeEditor?.getCode() || "",
  };
}
