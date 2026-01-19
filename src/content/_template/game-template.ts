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
// CẤU HÌNH GAME - CHỈNH SỬA PHẦN NÀY (LEGACY TEMPLATE)
// ============================================================

const GAME_CONFIG = {
  // Tiêu đề và mô tả
  title: "Tiêu đề game của bạn",
  description: `
    Mô tả chi tiết về game này.
    - Hướng dẫn 1
    - Hướng dẫn 2
    - Hướng dẫn 3
  `,

  // Hàm Python mà học sinh cần viết
  pythonFunction: "my_function",

  // Code Python mẫu cho học sinh
  starterCode: `def my_function(input_value):
    # Bắt đầu viết code ở đây
    
    
    # Kết thúc
    return result`,

  // Test cases
  testCases: [
    { input: "test1", expected: "result1", description: "Test case 1" },
    { input: "test2", expected: "result2", description: "Test case 2" },
  ],

  // Assets
  assets: {
    background: "/game-assets/your-game/bg.png",
    sounds: {
      correct: "/sound_global/correct.mp3",
      wrong: "/sound_global/wrong.mp3",
    },
  },

  // Phaser game config
  phaser: {
    width: 720,
    height: 520,
    backgroundColor: "#121425",
  },
};

// ============================================================
// CODE CHO PHẦN HIỂN THị - SỬ DỤNG CODE EDITOR MỚI
// ============================================================

const buildLayout = () => `
  <style>
    ${buildCodeEditorStyles()}
    .lesson-header { margin-bottom: 1.5rem; }
    .lesson-header h2 { font-size: 1.875rem; font-weight: 700; margin-bottom: 0.75rem; }
    .lesson-header p { color: #4b5563; line-height: 1.625; white-space: pre-line; }
    .lesson-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .lesson-game { display: flex; flex-direction: column; }
    .game-card { background: white; border-radius: 0.75rem; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .phaser-frame { background: #121425; border-radius: 0.5rem; overflow: hidden; aspect-ratio: 720/520; width: 100%; }
    .game-status { margin-top: 0.75rem; text-align: center; color: #6b7280; font-size: 0.875rem; }
    .lesson-side { display: flex; flex-direction: column; gap: 1rem; }
    .lesson-panel { background: white; border-radius: 0.75rem; padding: 1.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .code-panel { padding: 0; overflow: hidden; }
    .output-panel { font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace; font-size: 0.875rem; color: #374151; max-height: 200px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; }
    .output-panel:empty::before { content: 'Output sẽ hiển thị ở đây...'; color: #9ca3af; font-style: italic; }
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
`;

// ============================================================
// PHASER GAME LOGIC - TÙY CHỈNH THEO Ý MUỐN
// ============================================================

export default function initGame(
  root: HTMLElement,
  { pyodide }: { pyodide: any },
) {
  root.innerHTML = buildLayout();

  const status = root.querySelector("#status") as HTMLElement;
  const output = root.querySelector("#output") as HTMLElement;
  const submitButton = root.querySelector("#submit-code") as HTMLButtonElement;

  // Initialize enhanced code editor
  const codeEditor = initCodeEditor(root, GAME_CONFIG.starterCode);
  setupCodeFullscreen(root);

  let phaserGame: Phaser.Game | null = null;

  const logLine = (text: string) => {
    const line = document.createElement("div");
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  };

  const resetOutput = () => {
    output.textContent = "";
  };

  // Get code from editor
  const getCode = () => codeEditor?.getCode() || "";

  // ============================================================
  // TÙY CHỈNH PHASER GAME Ở ĐÂY
  // ============================================================
  const startPhaser = () => {
    if (phaserGame) {
      phaserGame.destroy(true);
      phaserGame = null;
    }

    let displayText: Phaser.GameObjects.Text | null = null;
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
          // Load assets
          this.load.image("BG", GAME_CONFIG.assets.background);
          this.load.audio("correct", GAME_CONFIG.assets.sounds.correct);
          this.load.audio("wrong", GAME_CONFIG.assets.sounds.wrong);
        },
        create() {
          correctSound = this.sound.add("correct");
          wrongSound = this.sound.add("wrong");

          // Background
          const bg = this.add.image(0, 0, "BG").setOrigin(0);
          bg.displayWidth = this.scale.gameSize.width;
          bg.displayHeight = this.scale.gameSize.height;

          // Text hiển thị kết quả (tùy chỉnh vị trí và style)
          displayText = this.add.text(360, 260, "Chờ submit code...", {
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
      setDisplay: (text: string, isCorrect: boolean) => {
        if (!displayText) return;
        displayText.setText(text);
        displayText.setColor(isCorrect ? "#00ff00" : "#ff0000");
      },
      playCorrect: () => correctSound && correctSound.play(),
      playWrong: () => wrongSound && wrongSound.play(),
    };
  };

  const ui = startPhaser();

  // ============================================================
  // PYTHON CODE VALIDATION
  // ============================================================
  if (!pyodide) {
    status.textContent = "Pyodide chưa sẵn sàng.";
    submitButton.disabled = true;
    submitButton.classList.add("disabled");
  } else {
    status.textContent = "Pyodide sẵn sàng. Hãy submit code.";
    pyodide.setStdout({
      batched: (text: string) => {
        if (text.trim()) logLine(text.trim());
      },
    });
  }

  submitButton.addEventListener("click", () => {
    resetOutput();
    status.textContent = "Đang chấm bài...";

    try {
      // Run student code
      withPyodideTimeout(pyodide, () => {
        pyodide.runPython(getCode());
      });

      const fn = pyodide.globals.get(GAME_CONFIG.pythonFunction);
      if (!fn) {
        status.textContent = `Chưa thấy hàm ${GAME_CONFIG.pythonFunction}()`;
        return;
      }

      // Test với test cases
      let allPassed = true;
      for (const testCase of GAME_CONFIG.testCases) {
        const resultProxy = withPyodideTimeout(pyodide, () =>
          fn(testCase.input),
        );
        const result = String(resultProxy);
        if (resultProxy?.destroy) resultProxy.destroy();

        const passed = result === testCase.expected;
        allPassed = allPassed && passed;

        logLine(
          `${testCase.description}: ${passed ? "✓ Đúng" : "✗ Sai"} (${result})`,
        );
      }

      if (allPassed) {
        status.textContent = "🎉 Hoàn thành! Tất cả test cases đều đúng!";
        ui.setDisplay("PASSED!", true);
        ui.playCorrect();
      } else {
        status.textContent = "❌ Có test case sai. Hãy thử lại.";
        ui.setDisplay("FAILED!", false);
        ui.playWrong();
      }
    } catch (error) {
      if (isPyodideTimeout(error)) {
        status.textContent = "Code chạy quá lâu. Hãy kiểm tra vòng lặp.";
      } else {
        status.textContent = "Có lỗi trong code.";
      }
      logLine(String(error));
      ui.setDisplay("ERROR!", false);
      ui.playWrong();
    }
  });
}
