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
// VÍ DỤ TYPE 2: CỘNG HAI SỐ (CODERUNNER STYLE)
// ============================================================

const GAME_CONFIG = {
  title: "Type 2 Example: Cộng hai số",
  description: `
    Viết code để đọc 2 số và in ra tổng của chúng.
    - Sử dụng input() để đọc số
    - Sử dụng print() để xuất kết quả
    
    Game sẽ tự động test với các bộ input khác nhau!
  `,

  // 3 test cases = 3 scenes
  testCases: [
    {
      input: "5\n10",
      expected: "15",
      description: "Scene 1: 5 + 10 = 15",
      sceneText: "🎮 Level 1: Số nhỏ",
    },
    {
      input: "100\n200",
      expected: "300",
      description: "Scene 2: 100 + 200 = 300",
      sceneText: "🎮 Level 2: Số lớn",
    },
    {
      input: "-5\n3",
      expected: "-2",
      description: "Scene 3: -5 + 3 = -2",
      sceneText: "🎮 Level 3: Số âm",
    },
  ],

  starterCode: `# Đọc 2 số từ input
a = int(input())
b = int(input())

# Tính tổng và in ra
total = a + b
print(total)`,

  sceneAssets: [
    { background: "/example-type2-add/scene1.png" },
    { background: "/example-type2-add/scene2.png" },
    { background: "/example-type2-add/scene3.png" },
  ],

  phaser: {
    width: 720,
    height: 520,
    backgroundColor: "#0f172a",
  },
};

// ============================================================
// LAYOUT WITH TEST CASE TABLE
// ============================================================

const buildLayout = () => `
  <style>
    ${buildCodeEditorStyles()}
    
    .lesson-header { margin-bottom: 1.5rem; }
    .lesson-header h2 { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.75rem; color: #1f2937; }
    .lesson-header p { color: #4b5563; line-height: 1.625; white-space: pre-line; }
    .lesson-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .lesson-game { display: flex; flex-direction: column; }
    .game-card { background: white; border-radius: 0.75rem; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .phaser-frame { background: #121425; border-radius: 0.5rem; overflow: hidden; aspect-ratio: 720/520; width: 100%; }
    .game-status { margin-top: 0.75rem; text-align: center; color: #6b7280; font-size: 0.875rem; }
    .scene-progress { margin-top: 0.5rem; text-align: center; font-weight: 600; color: #3b82f6; }
    .lesson-side { display: flex; flex-direction: column; gap: 1rem; }
    .lesson-panel { background: white; border-radius: 0.75rem; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .code-panel { padding: 0; overflow: hidden; }
    .output-panel { 
      font-family: 'JetBrains Mono', 'Fira Code', monospace; 
      font-size: 0.8rem; 
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
    
    @media (max-width: 1024px) { .lesson-layout { grid-template-columns: 1fr; } }
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
        <div class="code-actions" style="padding: 12px;">
          <button class="primary" id="submit-code">▶ Chạy Code</button>
          <button class="code-toggle" type="button">⛶ Phóng to</button>
        </div>
      </div>
      <div class="lesson-panel output-panel" id="output"></div>
      
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
    </aside>
  </div>
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
        <td class="input">${result.input.replace(/\n/g, "\\n")}</td>
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
          correctSound = this.sound.add("correct");
          wrongSound = this.sound.add("wrong");

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
  // PYTHON CODE VALIDATION - CODERUNNER STYLE
  // ============================================================

  const runTestForScene = (sceneIndex: number) => {
    const testCase = GAME_CONFIG.testCases[sceneIndex];

    try {
      // Setup stdin for input
      const inputLines = testCase.input.split("\n");
      let inputIndex = 0;

      pyodide.setStdin({
        stdin: () => {
          if (inputIndex < inputLines.length) {
            return inputLines[inputIndex++];
          }
          return "";
        },
      });

      // Capture stdout
      let capturedOutput = "";
      pyodide.setStdout({
        batched: (text: string) => {
          capturedOutput += text;
        },
      });

      // Run student code
      withPyodideTimeout(pyodide, () => {
        pyodide.runPython(codeEditor.getCode());
      });

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
      if (!passed) {
        logLine(`  Expected: ${expectedOutput}`);
        logLine(`  Got: ${actualOutput}`);
      }
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
        if (text.trim()) logLine(text.trim());
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
}
