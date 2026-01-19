// @ts-nocheck
import * as Phaser from "phaser";
import { isPyodideTimeout, withPyodideTimeout } from "@/lib/pyodideTimeout";

// ============================================================
// GAME 2: XÓA KÝ TỰ CUỐI - TYPE 1 MULTI-SCENE
// ============================================================

const GAME_CONFIG = {
  title: "Xóa ký tự cuối chuỗi",
  description: `
    Viết hàm remove_last_char() để xóa ký tự cuối cùng của chuỗi.
    - Input: Chuỗi có ký tự thừa ở cuối
    - Output: Chuỗi đã xóa ký tự cuối
    
    Giúp sửa lỗi chính tả cho các văn bản!
  `,

  pythonFunction: "remove_last_char",

  starterCode: `def remove_last_char(text):
    # Xóa ký tự cuối cùng
    # Gợi ý: Dùng slicing text[:-1]
    result = text
    return result`,

  testCases: [
    {
      input: "Nguyễn Anh Longg",
      expected: "Nguyễn Anh Long",
      description: "Scene 1: Tên có chữ g thừa",
      sceneText: "📝 Level 1: Tên người",
    },
    {
      input: "Pythonnn",
      expected: "Pythonn",
      description: "Scene 2: Xóa 1 chữ n thừa",
      sceneText: "💻 Level 2: Tên ngôn ngữ",
    },
    {
      input: "Hello World!!!",
      expected: "Hello World!!",
      description: "Scene 3: Xóa dấu chấm than thừa",
      sceneText: "✨ Level 3: Câu chào",
    },
  ],

  sceneAssets: [
    { background: "/python-basics/chapter-1/t10-cd-b12/id2/bg.png" },
    { background: "/python-basics/chapter-1/t10-cd-b12/id2/bg.png" },
    { background: "/python-basics/chapter-1/t10-cd-b12/id2/bg.png" },
  ],

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
    .lesson-header { margin-bottom: 1rem; }
    .lesson-header h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    .lesson-header p { color: #4b5563; line-height: 1.5; white-space: pre-line; font-size: 0.875rem; }
    .lesson-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .lesson-game { display: flex; flex-direction: column; }
    .game-card { background: white; border-radius: 0.5rem; padding: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .phaser-frame { background: #121425; border-radius: 0.5rem; overflow: hidden; aspect-ratio: 720/520; width: 100%; }
    .game-status { margin-top: 0.5rem; text-align: center; color: #6b7280; font-size: 0.75rem; }
    .scene-progress { margin-top: 0.25rem; text-align: center; font-weight: 600; color: #3b82f6; font-size: 0.875rem; }
    .lesson-side { display: flex; flex-direction: column; gap: 0.75rem; }
    .lesson-panel { background: white; border-radius: 0.5rem; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .code-panel h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; }
    .code-editor { width: 100%; min-height: 250px; padding: 0.75rem; font-family: 'Courier New', monospace; font-size: 0.8rem; border: 1px solid #d1d5db; border-radius: 0.5rem; resize: vertical; background: #f9fafb; }
    .code-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
    .code-actions button { padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; font-size: 0.875rem; }
    .code-actions button.primary { background: #3b82f6; color: white; }
    .code-actions button.primary:hover { background: #2563eb; }
    .code-actions button.primary:disabled { background: #9ca3af; cursor: not-allowed; }
    .code-toggle { background: #e5e7eb; color: #374151; }
    .code-toggle:hover { background: #d1d5db; }
    .output-panel { font-family: 'Courier New', monospace; font-size: 0.75rem; color: #374151; max-height: 150px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; }
    
    .testcase-table { margin-top: 0.75rem; display: none; }
    .testcase-table.visible { display: block; }
    .testcase-table table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
    .testcase-table th, .testcase-table td { padding: 0.375rem; border: 1px solid #d1d5db; text-align: left; }
    .testcase-table th { background: #f3f4f6; font-weight: 600; }
    .testcase-table .pass { color: #10b981; font-weight: 600; }
    .testcase-table .fail { color: #ef4444; font-weight: 600; }
    .testcase-table .input, .testcase-table .output { font-family: 'Courier New', monospace; font-size: 0.7rem; }
    
    .code-panel.fullscreen { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999; margin: 0; border-radius: 0; max-width: 100%; display: flex; flex-direction: column; }
    .code-panel.fullscreen .code-editor { flex: 1; min-height: 0; }
    body.no-scroll { overflow: hidden; }
    .next-scene-btn { 
      margin: 16px auto; 
      padding: 12px 32px; 
      font-size: 16px; 
      font-weight: 600; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      border: none; 
      border-radius: 8px; 
      cursor: pointer; 
      display: block;
      transition: all 0.3s ease;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .next-scene-btn:hover { 
      transform: translateY(-2px); 
      box-shadow: 0 6px 12px rgba(0,0,0,0.15);
    }
    .next-scene-btn:active { 
      transform: translateY(0); 
    }
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
        <button class="next-scene-btn" id="next-scene-btn" style="display: none;">Next Scene ➜</button>
      </div>
      
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
    </div>
    <aside class="lesson-side">
      <div class="lesson-panel code-panel">
        <h3>Code</h3>
        <textarea id="code-input" class="code-editor" spellcheck="false">${GAME_CONFIG.starterCode}</textarea>
        <div class="code-actions">
          <button class="primary" id="submit-code">Submit & Play</button>
          <button class="code-toggle" type="button">Phóng to</button>
        </div>
      </div>
      <div class="lesson-panel output-panel" id="output"></div>
    </aside>
  </div>
`;

// ============================================================
// GAME LOGIC
// ============================================================

const setupCodeFullscreen = (root: HTMLElement) => {
  const panel = root.querySelector(".code-panel");
  const toggle = root.querySelector(".code-toggle");
  if (!panel || !toggle) return;

  const setState = (isFullscreen: boolean) => {
    panel.classList.toggle("fullscreen", isFullscreen);
    document.body.classList.toggle("no-scroll", isFullscreen);
    toggle.textContent = isFullscreen ? "Thu nhỏ" : "Phóng to";
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

export default function initGame(
  root: HTMLElement,
  { pyodide }: { pyodide: any },
) {
  root.innerHTML = buildLayout();

  const status = root.querySelector("#status") as HTMLElement;
  const sceneProgress = root.querySelector("#scene-progress") as HTMLElement;
  const output = root.querySelector("#output") as HTMLElement;
  const submitButton = root.querySelector("#submit-code") as HTMLButtonElement;
  const codeInput = root.querySelector("#code-input") as HTMLTextAreaElement;
  const testcaseTable = root.querySelector("#testcase-table") as HTMLElement;
  const testcaseBody = root.querySelector("#testcase-body") as HTMLElement;
  const nextSceneBtn = root.querySelector(
    "#next-scene-btn",
  ) as HTMLButtonElement;

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
        <td class="input">${result.input}</td>
        <td class="input">${result.expected}</td>
        <td class="output">${result.actual}</td>
        <td class="${result.passed ? "pass" : "fail"}">${result.passed ? "✓ Pass" : "✗ Fail"}</td>
      `;
      testcaseBody.appendChild(row);
    });
  };

  codeInput.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const start = codeInput.selectionStart;
    const end = codeInput.selectionEnd;
    const value = codeInput.value;
    codeInput.value = `${value.slice(0, start)}    ${value.slice(end)}`;
    codeInput.selectionStart = codeInput.selectionEnd = start + 4;
  });

  setupCodeFullscreen(root);

  const startPhaser = () => {
    if (phaserGame) {
      phaserGame.destroy(true);
      phaserGame = null;
    }

    currentScene = 0;
    testResults = [];
    updateSceneProgress();

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
        currentSceneInstance = this;

        const bgKey = `BG${this.sceneIndex}`;
        if (this.textures.exists(bgKey)) {
          const bg = this.add.image(0, 0, bgKey).setOrigin(0);
          bg.displayWidth = this.scale.gameSize.width;
          bg.displayHeight = this.scale.gameSize.height;
        }

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

    class PreloadScene extends Phaser.Scene {
      constructor() {
        super({ key: "PreloadScene" });
      }

      preload() {
        GAME_CONFIG.sceneAssets?.forEach((asset, index) => {
          if (asset.background) {
            this.load.image(`BG${index}`, asset.background);
          }
        });
        this.load.audio("correct", "/sound_global/correct.mp3");
        this.load.audio("wrong", "/sound_global/wrong.mp3");
      }

      create() {
        correctSound = this.sound.add("correct");
        wrongSound = this.sound.add("wrong");
        this.scene.start("GameScene0");
      }
    }

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

        if (currentSceneInstance.showResult) {
          currentSceneInstance.showResult(passed);
        }

        setTimeout(() => {
          if (sceneIndex < GAME_CONFIG.testCases.length - 1) {
            nextSceneBtn.style.display = "block";
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

  const ui = startPhaser();

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
      withPyodideTimeout(pyodide, () => {
        pyodide.runPython(codeInput.value);
      });

      pythonFunction = pyodide.globals.get(GAME_CONFIG.pythonFunction);
      if (!pythonFunction) {
        status.textContent = `Chưa thấy hàm ${GAME_CONFIG.pythonFunction}()`;
        return;
      }

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
