// @ts-nocheck
import * as Phaser from "phaser";
import { isPyodideTimeout, withPyodideTimeout } from "@/lib/pyodideTimeout";

// ============================================================
// CẤU HÌNH GAME TYPE 2 - CODERUNNER STYLE
// ============================================================

const GAME_CONFIG = {
  // Tiêu đề và mô tả
  title: "Cuộc đua vượt chướng ngại vật",
  description: `
    Hãy giúp nhân vật vượt qua các chướng ngại vật!
    - Nếu là "duongdi" → in "chay"
    - Nếu là "vatcan" → in "nhay"
    Ghép các hành động bằng dấu "-"
  `,

  // Test cases với input và expected output
  // Mỗi test case = 1 scene trong game
  testCases: [
    {
      input: "duongdi-vatcan-duongdi",
      expected: "chay-nhay-chay",
      description: "Scene 1: Đường dễ (3 obstacles)",
      sceneText: "Level 1: Easy",
    },
    {
      input: "duongdi-vatcan-vatcan-duongdi-vatcan",
      expected: "chay-nhay-nhay-chay-nhay",
      description: "Scene 2: Đường trung bình (5 obstacles)",
      sceneText: "Level 2: Medium",
    },
    {
      input: "vatcan-duongdi-vatcan-duongdi-vatcan-duongdi-duongdi",
      expected: "nhay-chay-nhay-chay-nhay-chay-chay",
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
        actions.append("nhay")

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
    
    /* Test Case Table */
    .testcase-table { margin-top: 1rem; display: none; }
    .testcase-table.visible { display: block; }
    .testcase-table table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .testcase-table th, .testcase-table td { padding: 0.5rem; border: 1px solid #d1d5db; text-align: left; }
    .testcase-table th { background: #f3f4f6; font-weight: 600; }
    .testcase-table .pass { color: #10b981; font-weight: 600; }
    .testcase-table .fail { color: #ef4444; font-weight: 600; }
    .testcase-table .input, .testcase-table .output { font-family: 'Courier New', monospace; font-size: 0.75rem; white-space: pre-wrap; }
    
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

  codeInput.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const start = codeInput.selectionStart;
    const end = codeInput.selectionEnd;
    const value = codeInput.value;
    codeInput.value = `${value.slice(0, start)}    ${value.slice(end)}`;
    codeInput.selectionStart = codeInput.selectionEnd = start + 4;
  });

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
      this.obstacles = new Phaser.GameObjects.Group(this);
    }

    create() {
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
      this.playerActions = actualOutput.split("-");

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
      if (!this.player || !this.bot) return;

      console.log(
        `Scene ${this.sceneIndex}: Starting race with ${inputObstacles.length} elements, passed=${passed}`,
      );

      let currentIndex = 0;
      let playerFailed = false;
      let failPosition = -1;
      let failType = ""; // "vatcan" hoặc "duongdi" - để biết loại lỗi

      // Tìm vị trí sai và loại sai nếu failed
      if (!passed) {
        for (let i = 0; i < this.expectedActions.length; i++) {
          if (this.playerActions[i] !== this.expectedActions[i]) {
            failPosition = i;
            failType = inputObstacles[i]; // Loại obstacle tại vị trí sai
            break;
          }
        }
        console.log(`Fail at position ${failPosition}, type: ${failType}`);
      }

      // Player position lưu lại để biết vị trí gốc
      const playerOriginalY = this.player.y;
      const botOriginalY = this.bot.y;

      // Spawn từng element từ phải sang trái
      const spawnElement = () => {
        if (currentIndex >= inputObstacles.length || playerFailed) return;

        const element = inputObstacles[currentIndex];
        const elementIndex = currentIndex; // Capture current index
        const obstacleX = 720;

        console.log(
          `Spawning element ${elementIndex + 1}/${inputObstacles.length}: ${element}`,
        );

        // Chỉ spawn vật cản nếu là "vatcan"
        let playerObstacle: Phaser.GameObjects.Image | null = null;
        let botObstacle: Phaser.GameObjects.Image | null = null;

        if (element === "vatcan") {
          // Vật cản - rock2 sprite
          playerObstacle = this.add.image(obstacleX, playerOriginalY, "rock");
          playerObstacle.setScale(0.7);
          botObstacle = this.add.image(obstacleX, botOriginalY, "rock");
          botObstacle.setScale(0.7);
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
        const targets =
          playerObstacle && botObstacle
            ? [marker, playerObstacle, botObstacle]
            : [marker];

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
                this.tweens.add({
                  targets: this.bot,
                  y: botOriginalY - 80,
                  duration: 300,
                  yoyo: true,
                  ease: "Quad.easeOut",
                });
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

                if (failType === "vatcan" && playerObstacle) {
                  // Sai tại vật cản → bị đẩy đi theo vật cản
                  this.playerHitByObstacle(playerObstacle);
                } else {
                  // Sai linh tinh (không phải vật cản) → ngã và trôi đi
                  this.playerFallDown();
                }
              } else if (element === "vatcan" && this.player) {
                // Player đúng và có vật cản → né xuống
                this.tweens.add({
                  targets: this.player,
                  y: playerOriginalY + 80,
                  duration: 300,
                  yoyo: true,
                  ease: "Quad.easeOut",
                });
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
      if (!this.player) return;

      this.player.stop();
      this.cameras.main.shake(300, 0.01);

      // Player bị đẩy theo vật cản ra khỏi màn hình
      this.tweens.add({
        targets: this.player,
        x: -150,
        duration: 1200,
        ease: "Power2",
        onComplete: () => {
          this.add
            .text(360, 200, "💥 CRASHED!", {
              fontSize: "36px",
              color: "#ef4444",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
        },
      });
    }

    // Player ngã và trôi đi (sai linh tinh)
    playerFallDown() {
      if (!this.player) return;

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
          this.tweens.add({
            targets: this.player,
            x: -150,
            y: (this.player?.y || 400) + 50,
            duration: 1500,
            ease: "Linear",
            onComplete: () => {
              this.add
                .text(360, 200, "😵 WRONG OUTPUT!", {
                  fontSize: "32px",
                  color: "#f59e0b",
                  fontStyle: "bold",
                })
                .setOrigin(0.5);
            },
          });
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
      if (!this.player) return;

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

          this.add
            .text(360, 150, "🎉 YOU WIN!", {
              fontSize: "36px",
              color: "#10b981",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
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
      correctSound = this.sound.add("correct");
      wrongSound = this.sound.add("wrong");

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
    if (phaserGame) {
      phaserGame.destroy(true);
      phaserGame = null;
    }

    currentScene = 0;
    testResults = [];
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
        pyodide.runPython(codeInput.value);
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
    nextSceneBtn.style.display = "none";

    // Restart Phaser game từ đầu để reset player position
    ui = startPhaser();

    // Đợi game khởi tạo xong rồi mới chạy test
    setTimeout(() => {
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
    }, 300);
  });
}
