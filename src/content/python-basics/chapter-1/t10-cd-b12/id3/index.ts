// @ts-nocheck
import * as Phaser from "phaser";
import { isPyodideTimeout, withPyodideTimeout } from "@/lib/pyodideTimeout";
import {
  buildCodeEditorStyles,
  buildCodeEditorHTML,
  initCodeEditor,
  setupCodeFullscreen,
} from "@/lib/codeEditor";
import { setupContestSubmission } from "@/lib/contestIntegration";

// ============================================================
// GAME PATH - Quan trọng cho contest integration
// ============================================================
const GAME_PATH = "python-basics/chapter-1/t10-cd-b12/id3";

// ============================================================
// CẤU HÌNH GAME TYPE 2 - CODERUNNER STYLE
// ============================================================

const GAME_CONFIG = {
  // Tiêu đề và mô tả
  title: "Cuộc đua vượt chướng ngại vật",
  description: `
    Hãy giúp nhân vật vượt qua các chướng ngại vật!
    - Nếu là "duongdi" → in "chay"
    - Nếu là "vatcan" → in "ne"
    Ghép các hành động bằng dấu "-"
  `,

  // Test cases với input và expected output
  // Mỗi test case = 1 scene trong game
  testCases: [
    {
      input: "duongdi-vatcan-duongdi",
      expected: "chay-ne-chay",
      description: "Scene 1: Đường dễ (3 obstacles)",
      sceneText: "Level 1: Easy",
    },
    {
      input: "duongdi-vatcan-vatcan-duongdi-vatcan",
      expected: "chay-ne-ne-chay-ne",
      description: "Scene 2: Đường trung bình (5 obstacles)",
      sceneText: "Level 2: Medium",
    },
    {
      input: "vatcan-duongdi-vatcan-duongdi-vatcan-duongdi-duongdi",
      expected: "ne-chay-ne-chay-ne-chay-chay",
      description: "Scene 3: Đường khó (7 obstacles)",
      sceneText: "Level 3: Hard",
    },
  ],

  // Code Python mẫu cho học sinh (sử dụng input() và print())
  starterCode: `# Đọc chuỗi chướng ngại vật
obstacles = input()

# Tách chuỗi thành list
items = obstacles.split("-")

# Tạo list hành động
actions = []
for item in items:
    if item == "duongdi":
        actions.append("chay")
    elif item == "vatcan":
        actions.append("ne")

# Ghép và in kết quả
result = "-".join(actions)
print(result)`,

  // Assets cho từng scene (optional)
  // Path format: /[course]/[topic]/[lesson]/[game]/scene1.png
  // Example: /python-basics/chapter-1/t10-cd-b12/id1/scene1.png
  sceneAssets: [
    // No background for this game
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
    .lesson-header { margin-bottom: 1rem; }
    .lesson-header h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
    .lesson-header p { color: #4b5563; line-height: 1.5; white-space: pre-line; font-size: 0.875rem; }
    .lesson-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .lesson-game { display: flex; flex-direction: column; }
    .game-card { background: white; border-radius: 0.5rem; padding: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
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
    .game-status { margin-top: 0.5rem; text-align: center; color: #6b7280; font-size: 0.75rem; }
    .scene-progress { margin-top: 0.25rem; text-align: center; font-weight: 600; color: #3b82f6; font-size: 0.875rem; }
    .lesson-side { display: flex; flex-direction: column; gap: 0.75rem; }
    .lesson-panel { background: white; border-radius: 0.5rem; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .code-panel { padding: 0; overflow: hidden; }
    .output-panel { font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace; font-size: 0.75rem; color: #374151; max-height: 150px; overflow-y: auto; white-space: pre-wrap; word-break: break-word; }
    .output-panel:empty::before { content: 'Output sẽ hiển thị ở đây...'; color: #9ca3af; font-style: italic; }
    
    /* Test Case Table */
    .testcase-table { margin-top: 1rem; display: none; }
    .testcase-table.visible { display: block; }
    .testcase-table table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .testcase-table th, .testcase-table td { padding: 0.5rem; border: 1px solid #d1d5db; text-align: left; }
    .testcase-table th { background: #f3f4f6; font-weight: 600; }
    .testcase-table .pass { color: #10b981; font-weight: 600; }
    .testcase-table .fail { color: #ef4444; font-weight: 600; }
    .testcase-table .input, .testcase-table .output { font-family: 'Courier New', monospace; font-size: 0.75rem; white-space: pre-wrap; }
    
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
      .testcase-table th, .testcase-table td { padding: 0.3rem 0.4rem; }
      .next-scene-btn { 
        padding: 12px 28px; 
        font-size: 15px;
        bottom: 20px;
        right: 20px;
      }
    }
    
    @media (max-width: 640px) {
      .lesson-header h2 { font-size: 1.1rem; }
      .lesson-header p { font-size: 0.75rem; line-height: 1.4; }
      .game-card { padding: 0.5rem; }
      .lesson-panel { padding: 0.5rem; }
      .output-panel { max-height: 100px; font-size: 0.65rem; }
      .testcase-table { font-size: 0.65rem; }
      .testcase-table th, .testcase-table td { padding: 0.25rem 0.3rem; font-size: 0.6rem; }
      .testcase-table h3 { font-size: 0.85rem; }
      .game-status { font-size: 0.7rem; }
      .scene-progress { font-size: 0.8rem; }
      .next-scene-btn { 
        padding: 10px 20px; 
        font-size: 13px;
        bottom: 16px;
        right: 16px;
        border-radius: 40px;
      }
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
    </div>
    <aside class="lesson-side">
      <div class="lesson-panel code-panel">
        ${buildCodeEditorHTML(GAME_CONFIG.starterCode)}
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

      // Đợi scene mới được tạo xong rồi mới chạy test
      setTimeout(() => {
        runTestForScene(currentScene);
      }, 100);
    }
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

  const playFeedbackSound = (sound: Phaser.Sound.BaseSound | null) => {
    try {
      if (!sound) return;
      if (sound.isPlaying) sound.stop();
      sound.play();
    } catch (error) {
      console.warn("Could not play feedback sound:", error);
    }
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

  // Khởi tạo code editor với các tính năng nâng cao
  initCodeEditor(root, GAME_CONFIG.starterCode);
  setupCodeFullscreen(root);

  // ============================================================
  // PHASER MULTI-SCENE GAME - TRUE SCENE SWITCHING
  // ============================================================

  // Base Scene class for each level
  class GameScene extends Phaser.Scene {
    private sceneIndex: number;
    private player?: Phaser.GameObjects.Sprite;
    private bot?: Phaser.GameObjects.Sprite;
    private obstacles: Phaser.GameObjects.Group;
    private playerActions: string[] = [];
    private expectedActions: string[] = [];
    private bg1?: Phaser.GameObjects.Image;
    private bg2?: Phaser.GameObjects.Image;
    private tower?: Phaser.GameObjects.Image;
    private botTower?: Phaser.GameObjects.Image;
    private isScrolling: boolean = false;

    constructor(sceneIndex: number) {
      super({ key: `GameScene${sceneIndex}` });
      this.sceneIndex = sceneIndex;
      // DO NOT initialize Phaser objects here - they must be created in create()
    }

    create() {
      // Safety check for Phaser APIs
      if (!this.add || !this.tweens || !this.cameras || !this.time) {
        console.error("Phaser APIs not ready in create()");
        // Don't restart - let waitForSceneReady() handle initialization wait
        return;
      }

      currentSceneInstance = this;

      // Reset state cho scene mới
      this.playerActions = [];
      this.expectedActions = [];
      this.obstacles = new Phaser.GameObjects.Group(this);
      this.isScrolling = false;

      // Scrolling background - 2 images side by side
      this.bg1 = this.add.image(360, 260, "bg");
      this.bg1.setDisplaySize(720, 520);
      this.bg2 = this.add.image(360 + 720, 260, "bg");
      this.bg2.setDisplaySize(720, 520);

      // Title
      this.add
        .text(360, 30, GAME_CONFIG.testCases[this.sceneIndex].sceneText, {
          fontSize: "24px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);

      // Player (paddlefish sprite)
      this.player = this.add.sprite(150, 400, "player-sprite");
      this.player.setScale(0.8);
      this.player.play("player-run");

      // Debug: Player collide box
      const playerBox = this.add.rectangle(
        150,
        400,
        this.player.displayWidth / 3,
        this.player.displayHeight / 3,
      );

      this.add
        .text(150, 360, "YOU", { fontSize: "14px", color: "#fff" })
        .setOrigin(0.5);

      // Bot (sheep sprite) - only show top half
      this.bot = this.add.sprite(150, 250, "bot-sprite");
      this.bot.setScale(1);
      this.bot.play("bot-run");
      // Crop to show only top half (y from 0 to half height)
      this.bot.setCrop(0, 0, 128, 70);

      // Debug: Bot collide box
      const botBox = this.add.rectangle(
        150,
        250,
        this.bot.displayWidth,
        this.bot.displayHeight,
      );
      this.add
        .text(150, 210, "BOT", { fontSize: "14px", color: "#fff" })
        .setOrigin(0.5);

      // Waiting text
      this.add
        .text(360, 200, "Chờ kết quả...", {
          fontSize: "20px",
          color: "#fff",
        })
        .setOrigin(0.5);
    }

    showResult(passed: boolean) {
      // Parse expected và actual actions
      const testCase = GAME_CONFIG.testCases[this.sceneIndex];
      const inputObstacles = testCase.input.split("-");
      this.expectedActions = testCase.expected.split("-");

      // Get actual output từ testResults
      const actualOutput = testResults[this.sceneIndex]?.actual || "";
      this.playerActions = actualOutput ? actualOutput.split("-") : [];

      // Clear waiting text
      this.children.list.forEach((child) => {
        if (
          child instanceof Phaser.GameObjects.Text &&
          (child as Phaser.GameObjects.Text).text === "Chờ kết quả..."
        ) {
          child.destroy();
        }
      });

      // Start racing game với vật cản chạy từ phải sang
      this.startRacingGame(inputObstacles, passed);
    }

    startRacingGame(inputObstacles: string[], passed: boolean) {
      // Comprehensive safety check
      if (
        !this.player ||
        !this.bot ||
        !this.add ||
        !this.tweens ||
        !this.time
      ) {
        console.error("Phaser scene not fully initialized");
        return;
      }

      console.log(
        `Scene ${this.sceneIndex}: Starting race with ${inputObstacles.length} elements, passed=${passed}`,
      );

      let currentIndex = 0;
      let playerFailed = false;
      let failPosition = -1;
      let failMode = "";
      const getRandomFailPosition = (total: number) => {
        if (total <= 1) return 0;
        const minIndex = Math.max(1, Math.floor(total * 0.45));
        return Phaser.Math.Between(minIndex, total - 1);
      };
      let failType = ""; // "vatcan" hoặc "duongdi" - để biết loại lỗi

      // Tìm vị trí sai và loại sai nếu failed
      if (!passed) {
        const actualLength = (testResults[this.sceneIndex]?.actual || "").trim()
          .length;
        const expectedLength = (testCase.expected || "").trim().length;
        failMode =
          actualLength > expectedLength
            ? "fall"
            : actualLength === expectedLength
              ? "crash"
              : "fall";

        for (let i = 0; i < this.expectedActions.length; i++) {
          if (this.playerActions[i] !== this.expectedActions[i]) {
            failPosition = i;
            failType = inputObstacles[i]; // Loại obstacle tại vị trí sai
            break;
          }
        }
        if (failPosition === -1) {
          failPosition = Math.max(0, inputObstacles.length - 1);
          failType = inputObstacles[failPosition];
        }
        failPosition = getRandomFailPosition(inputObstacles.length);
        failType = inputObstacles[failPosition];

        console.log(
          `Fail at position ${failPosition}, type: ${failType}, mode: ${failMode}`,
        );
      }

      // Player position lưu lại để biết vị trí gốc
      const playerOriginalY = this.player.y;
      const botOriginalY = this.bot.y;

      // Spawn từng element từ phải sang trái
      const spawnElement = () => {
        if (currentIndex >= inputObstacles.length || playerFailed) return;

        // Safety check: Phaser APIs must be ready
        if (!this.add || !this.tweens) {
          console.error("Phaser APIs not ready in spawnElement");
          return;
        }

        const element = inputObstacles[currentIndex];
        const elementIndex = currentIndex; // Capture current index
        const obstacleX = 720;

        console.log(
          `Spawning element ${elementIndex + 1}/${inputObstacles.length}: ${element}`,
        );

        // Chỉ spawn vật cản nếu là "vatcan"
        let playerObstacle: Phaser.GameObjects.Image | null = null;
        let botObstacle: Phaser.GameObjects.Image | null = null;
        const shouldForceCrashRock =
          !passed && failMode === "crash" && elementIndex === failPosition;

        if (element === "vatcan" || shouldForceCrashRock) {
          // Vật cản - rock2 sprite
          playerObstacle = this.add.image(obstacleX, playerOriginalY, "rock");
          playerObstacle.setScale(0.7);
          if (element === "vatcan") {
            botObstacle = this.add.image(obstacleX, botOriginalY, "rock");
            botObstacle.setScale(0.7);
          }
        }

        // Tạo marker để track vị trí (invisible)
        const marker = this.add.rectangle(
          obstacleX,
          playerOriginalY,
          10,
          10,
          0x000000,
          0,
        );

        let playerHasDodged = false;
        let botHasDodged = false;

        // Di chuyển marker (và obstacles nếu có)
        const targets = [marker, playerObstacle, botObstacle].filter(Boolean);

        if (!this.tweens) return; // Safety check

        this.tweens.add({
          targets: targets,
          x: -100,
          duration: 2500,
          ease: "Linear",
          onUpdate: () => {
            const markerX = marker.x;

            // === BOT TỰ ĐỘNG NÉ KHI VẬT CẢN CHẠM HITBOX ===
            if (element === "vatcan" && botObstacle && this.bot) {
              // Khi vật cản chạm vào hitbox của bot (x ~ 150)
              if (markerX < 250 && markerX > 100 && !botHasDodged) {
                botHasDodged = true;
                if (this.tweens) {
                  this.tweens.add({
                    targets: this.bot,
                    y: botOriginalY - 80,
                    duration: 300,
                    yoyo: true,
                    ease: "Quad.easeOut",
                  });
                }
              }
            }

            // === PLAYER LOGIC ===
            if (
              markerX < 250 &&
              markerX > 100 &&
              !playerHasDodged &&
              !playerFailed
            ) {
              playerHasDodged = true;

              if (elementIndex === failPosition) {
                // Player sai tại vị trí này
                playerFailed = true;

                if (failMode === "crash" && playerObstacle) {
                  // Sai tại vật cản → bị đẩy đi theo vật cản
                  this.playerHitByObstacle(playerObstacle);
                } else {
                  // Sai linh tinh (không phải vật cản) → ngã và trôi đi
                  this.playerFallDown();
                }
              } else if (element === "vatcan" && this.player) {
                // Player đúng và có vật cản → né xuống
                if (this.tweens) {
                  this.tweens.add({
                    targets: this.player,
                    y: playerOriginalY + 80,
                    duration: 300,
                    yoyo: true,
                    ease: "Quad.easeOut",
                  });
                }
              }
            }
          },
          onComplete: () => {
            marker.destroy();
            if (playerObstacle) playerObstacle.destroy();
            if (botObstacle) botObstacle.destroy();
          },
        });

        currentIndex++;

        // Spawn element tiếp theo sau delay
        if (currentIndex < inputObstacles.length) {
          this.time.delayedCall(800, spawnElement);
        } else {
          // Hết elements - spawn tower (đích đến)
          this.time.delayedCall(1000, () => {
            this.spawnTower(playerFailed, passed);
          });
        }
      };

      // Bắt đầu scroll background
      this.isScrolling = true;

      // Bắt đầu spawn
      spawnElement();
    }

    // Player bị vật cản đẩy đi
    playerHitByObstacle(obstacle: Phaser.GameObjects.Image) {
      if (!this.player || !this.tweens || !this.cameras) return;

      this.player.stop();
      this.cameras.main.shake(300, 0.01);

      // Player bị đẩy theo vật cản ra khỏi màn hình
      this.tweens.add({
        targets: this.player,
        x: -150,
        duration: 1200,
        ease: "Power2",
        onComplete: () => {
          if (this.add) {
            this.add
              .text(360, 200, "💥 CRASHED!", {
                fontSize: "36px",
                color: "#ef4444",
                fontStyle: "bold",
              })
              .setOrigin(0.5);
          }
        },
      });
    }

    // Player ngã và trôi đi (sai linh tinh)
    playerFallDown() {
      if (!this.player || !this.tweens) return;

      // Dừng animation, về frame đầu
      this.player.stop();
      this.player.setFrame(0);

      // Rotate 90 độ (ngã xuống)
      this.tweens.add({
        targets: this.player,
        angle: 90,
        duration: 300,
        ease: "Power2",
        onComplete: () => {
          // Trôi ra khỏi màn hình (bị bỏ lại)
          if (this.tweens && this.player) {
            this.tweens.add({
              targets: this.player,
              x: -150,
              y: (this.player?.y || 400) + 50,
              duration: 1500,
              ease: "Linear",
              onComplete: () => {
                if (this.add) {
                  this.add
                    .text(360, 200, "😵 WRONG OUTPUT!", {
                      fontSize: "32px",
                      color: "#f59e0b",
                      fontStyle: "bold",
                    })
                    .setOrigin(0.5);
                }
              },
            });
          }
        },
      });
    }

    update() {
      // Scrolling background
      if (this.isScrolling && this.bg1 && this.bg2) {
        const scrollSpeed = 2;
        this.bg1.x -= scrollSpeed;
        this.bg2.x -= scrollSpeed;

        // Reset background position for infinite scroll
        if (this.bg1.x <= -360) {
          this.bg1.x = this.bg2.x + 720;
        }
        if (this.bg2.x <= -360) {
          this.bg2.x = this.bg1.x + 720;
        }
      }
    }

    spawnTower(playerFailed: boolean, passed: boolean) {
      // Safety check
      if (!this.add || !this.tweens) {
        console.error("Phaser APIs not ready in spawnTower");
        return;
      }

      // Tower cho player xuất hiện từ phải, dừng lại ở vị trí đích
      this.tower = this.add.image(800, 350, "tower");
      this.tower.setScale(0.5);

      // Tower cho bot (song song với tower player)
      this.botTower = this.add.image(800, 200, "tower");
      this.botTower.setScale(0.5);

      // Cả 2 tower chạy vào và dừng lại ở x = 550
      this.tweens.add({
        targets: [this.tower, this.botTower],
        x: 550,
        duration: 2000,
        ease: "Power2",
        onComplete: () => {
          // Dừng scroll background
          this.isScrolling = false;

          if (!playerFailed && passed) {
            this.playerWin();
          }
        },
      });
    }

    playerCrash() {
      // Deprecated - replaced by playerHitByObstacle and playerFallDown
    }

    playerWin() {
      if (!this.player || !this.tweens || !this.add) return;

      // Player chạy xa hơn đến gần tower (đích)
      this.tweens.add({
        targets: this.player,
        x: 480, // Chạy đến gần tower
        duration: 1500,
        ease: "Power2",
        onComplete: () => {
          // Dừng animation
          this.player?.stop();
          this.player?.setFrame(0);

          if (this.add) {
            this.add
              .text(360, 150, "🎉 YOU WIN!", {
                fontSize: "36px",
                color: "#10b981",
                fontStyle: "bold",
              })
              .setOrigin(0.5);
          }
        },
      });
    }
  }

  // Preload Scene - load all assets once
  class PreloadScene extends Phaser.Scene {
    constructor() {
      super({ key: "PreloadScene" });
    }

    preload() {
      const basePath = "/python-basics/chapter-1/t10-cd-b12/id3";

      // Load spritesheets for player and bot
      this.load.spritesheet("player-sprite", `${basePath}/PaddleFish_Run.png`, {
        frameWidth: 192,
        frameHeight: 192,
      });
      this.load.spritesheet("bot-sprite", `${basePath}/Sheep_Move.png`, {
        frameWidth: 128,
        frameHeight: 128,
      });

      // Load background
      this.load.image("bg", `${basePath}/bg.jpg`);

      // Load rock obstacle (only rock2)
      this.load.image("rock", `${basePath}/Rock2.png`);

      // Load tower (finish line)
      this.load.image("tower", `${basePath}/Tower_Blue.png`);

      this.load.audio("correct", "/sound_global/correct.mp3");
      this.load.audio("wrong", "/sound_global/wrong.mp3");
    }

    create() {
      // Initialize sounds with proper error handling
      try {
        if (this.sound && this.sound.context) {
          // Check AudioContext state
          const audioContext = this.sound.context;

          // Only initialize sounds if AudioContext is not closed
          if (audioContext.state !== "closed") {
            correctSound = this.sound.add("correct");
            wrongSound = this.sound.add("wrong");

            // Resume AudioContext if suspended (user interaction requirement)
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

      // Create animations for player and bot
      this.anims.create({
        key: "player-run",
        frames: this.anims.generateFrameNumbers("player-sprite", {
          start: 0,
          end: 5,
        }),
        frameRate: 10,
        repeat: -1,
      });

      this.anims.create({
        key: "bot-run",
        frames: this.anims.generateFrameNumbers("bot-sprite", {
          start: 0,
          end: 3,
        }),
        frameRate: 8,
        repeat: -1,
      });

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

    // Reset global state and sounds
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
          currentSceneInstance.cameras &&
          currentSceneInstance.time &&
          currentSceneInstance.player &&
          currentSceneInstance.bot
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
      console.error(`Test case not found for scene ${sceneIndex}`);
      return;
    }

    try {
      const inputLines = testCase.input ? testCase.input.split("\n") : [];

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

      withPyodideTimeout(pyodide, () => {
        pyodide.runPython(codeInput.value);
      });

      const capturedOutput = pyodide.runPython(`_captured_output.getvalue()`);

      pyodide.runPython(`
sys.stdout = sys.__stdout__
del input
`);

      // Compare output
      const actualOutput = capturedOutput.trim();
      const expectedOutput = (testCase.expected || "").trim();
      const passed = actualOutput === expectedOutput;
      playFeedbackSound(passed ? correctSound : wrongSound);

      testResults[sceneIndex] = {
        input: testCase.input || "",
        expected: expectedOutput,
        actual: actualOutput,
        passed: passed,
        description: testCase.description || `Test ${sceneIndex + 1}`,
      };

      updateTestCaseTable();
      ui.showResult(sceneIndex, testResults[sceneIndex]);

      logLine(
        `Scene ${sceneIndex + 1}: ${passed ? "✓ Pass" : "✗ Fail"} - ${testCase.description || ""}`,
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
      playFeedbackSound(wrongSound);
      testResults[sceneIndex] = {
        input: testCase.input || "",
        expected: testCase.expected || "",
        actual: String(error),
        passed: false,
        description: testCase.description || `Test ${sceneIndex + 1}`,
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
    nextSceneBtn.style.display = "none";

    // Restart Phaser game từ đầu để reset player position
    ui = startPhaser();

    // Wait for scene to be fully initialized before running tests
    try {
      await waitForSceneReady();
      status.textContent = "Đang chấm bài và chạy game...";

      // Start from scene 0
      runTestForScene(0);
    } catch (error) {
      status.textContent = "Lỗi khởi tạo game. Vui lòng thử lại.";
      logLine("❌ Game initialization failed. Please refresh and try again.");
      console.error(error);
    }
  });

  // ============================================================
  // CONTEST INTEGRATION - Tích hợp cuộc thi
  // ============================================================
  // Hàm này sẽ kiểm tra game có đang trong cuộc thi không
  // Nếu có, sẽ hiển thị nút "Nộp code cuộc thi"

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

  // Setup contest submission (sẽ tự động kiểm tra và hiển thị nút nếu có cuộc thi)
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

  // Expose game instance globally for session submission
  (window as any).gameInstance = {
    getTestResults: getTestResults,
    getScore: getScore,
    getCode: () => codeInput.value,
  };
}
