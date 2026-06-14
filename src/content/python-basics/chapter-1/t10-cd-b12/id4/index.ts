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
const GAME_PATH = "python-basics/chapter-1/t10-cd-b12/id4";

// ============================================================
// CẤU HÌNH GAME TYPE 2 - CODERUNNER STYLE
// ============================================================

const GAME_CONFIG = {
  // Tiêu đề và mô tả
  title: "Game 4: Hiệp sĩ quả cảm",
  description: `BÀI TOÁN
Cho xâu s mô tả một dãy phép thuật. Mỗi phép thuật là cau_lua hoặc cau_bang, hai phép thuật liên tiếp được phân cách bằng dấu sao (*).

Hãy tạo dãy khiên tương ứng theo các quy tắc:
- cau_lua được đổi thành khien_lua.
- cau_bang được đổi thành khien_bang.
- Giữ nguyên thứ tự và dấu sao giữa các phần tử.

DỮ LIỆU VÀO
Một dòng duy nhất chứa xâu s.

DỮ LIỆU RA
In ra xâu biểu diễn dãy khiên tương ứng.`,

  // Test cases với input và expected output
  // Mỗi test case = 1 scene trong game
  // Dùng "\n" để phân tách nhiều lần gọi input() trong 1 test case
  // Ví dụ: input = "5\n10" → input() lần 1 = "5", input() lần 2 = "10"
  // Hãy dùng Generate Tests trong Content Manager để tự động tạo test cases
    ioExamples: [
    { input: "cau_lua*cau_bang*cau_lua*cau_bang", output: "khien_lua*khien_bang*khien_lua*khien_bang" }
  ],

    testCases: [
    {
      input: "cau_lua*cau_bang*cau_lua",
      expected: "khien_lua*khien_bang*khien_lua",
      description: "Test case 1",
      sceneText: "Level 1",
    },
    {
      input: "cau_bang*cau_bang*cau_lua*cau_bang",
      expected: "khien_bang*khien_bang*khien_lua*khien_bang",
      description: "Test case 2",
      sceneText: "Level 2",
    },
    {
      input: "cau_lua*cau_lua*cau_bang*cau_lua*cau_bang",
      expected: "khien_lua*khien_lua*khien_bang*khien_lua*khien_bang",
      description: "Test case 3",
      sceneText: "Level 3",
    },
    {
      input: "cau_bang*cau_lua*cau_bang*cau_lua*cau_bang*cau_lua*cau_lua",
      expected: "khien_bang*khien_lua*khien_bang*khien_lua*khien_bang*khien_lua*khien_lua",
      description: "Test case 4",
      sceneText: "Level 4",
    }
  ],
  // Code Python mẫu cho học sinh (sử dụng input() và print())
  starterCode: ``,

  // Assets cho từng scene (optional)
  // Path format: /[course]/[topic]/[lesson]/[game]/scene1.png
  // Example: /python-basics/chapter-1/t10-cd-b12/id1/scene1.png
  sceneAssets: [
    { background: "/python-basics/chapter-1/t10-cd-b12/id4/bg.png" },
    { background: "/python-basics/chapter-1/t10-cd-b12/id4/bg.png" },
    { background: "/python-basics/chapter-1/t10-cd-b12/id4/bg.png" },
    { background: "/python-basics/chapter-1/t10-cd-b12/id4/bg.png" },
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
    .lesson-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; }
    .lesson-game { display: flex; flex-direction: column; min-width: 0; }
    .game-card { min-width: 0; background: white; border-radius: 0.75rem; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .phaser-frame { 
      background: #121425; 
      border-radius: 0.5rem; 
      overflow: hidden; 
      aspect-ratio: 720/520; 
      width: 100%; 
      max-width: 100%;
      min-width: 0;
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
    .lesson-side { display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
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
    .testcase-table { margin-top: 1rem; display: none; min-width: 0; overflow-x: auto; }
    .testcase-table.visible { display: block; }
    .testcase-table h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; color: #1f2937; }
    .testcase-table table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 0.8rem; }
    .testcase-table th, .testcase-table td { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; text-align: left; overflow-wrap: anywhere; word-break: break-word; }
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

  <!-- Full-width result table, independent from the game/editor grid -->
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
  let correctSound: Phaser.Sound.BaseSound | null = null;
  let wrongSound: Phaser.Sound.BaseSound | null = null;
  let attackSound: Phaser.Sound.BaseSound | null = null;

  // Event listener cho nút Next Scene
  nextSceneBtn.addEventListener("click", async () => {
    nextSceneBtn.style.display = "none";
    currentScene++;
    updateSceneProgress();
    status.textContent = "Đang chuyển scene...";

    // Chuyển sang scene Phaser tiếp theo
    if (currentSceneInstance && phaserGame) {
      const nextSceneKey = `GameScene${currentScene}`;
      const activeScene = currentSceneInstance;
      currentSceneInstance = null;
      activeScene.scene.start(nextSceneKey);
    }

    try {
      await waitForSceneReady();
      status.textContent = "Đang chấm bài và chạy game...";
    } catch (error) {
      status.textContent = "Lỗi khởi tạo scene. Vui lòng thử lại.";
      logLine("Scene initialization failed. Please refresh and try again.");
      console.error(error);
      return;
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
    private spellText: any;
    private warrior?: Phaser.GameObjects.Sprite;
    private wizard?: Phaser.GameObjects.Sprite;
    private shield?: Phaser.GameObjects.Image;
    private resultHandled = false;
    private readonly characterScale = 1.15;
    private readonly groundY = 380;

    constructor(sceneIndex: number) {
      super({ key: `GameScene${sceneIndex}` });
      this.sceneIndex = sceneIndex;
    }

    create() {
      if (!this.add || !this.tweens || !this.cameras) {
        console.error("Phaser APIs not ready in create()");
        return;
      }

      currentSceneInstance = this;
      this.resultHandled = false;

      const bgKey = `BG${this.sceneIndex}`;
      const activeBgKey = this.textures.exists(bgKey) ? bgKey : "BG0";
      if (this.textures.exists(activeBgKey)) {
        const bg = this.add.image(0, 0, activeBgKey).setOrigin(0);
        bg.displayWidth = this.scale.gameSize.width;
        bg.displayHeight = this.scale.gameSize.height;
      }

      this.sceneText = this.add.text(
        360,
        28,
        GAME_CONFIG.testCases[this.sceneIndex]?.sceneText ||
          `Level ${this.sceneIndex + 1}`,
        {
          fontFamily: "Space Grotesk, sans-serif",
          fontSize: "25px",
          fontStyle: "bold",
          color: "#ffffff",
          align: "center",
          stroke: "#24113f",
          strokeThickness: 5,
        },
      );
      this.sceneText.setOrigin(0.5).setDepth(20);

      this.displayText = this.add.text(360, 63, "Chờ kết quả...", {
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#f8fafc",
        align: "center",
        stroke: "#171126",
        strokeThickness: 4,
      });
      this.displayText.setOrigin(0.5).setDepth(20);

      this.spellText = this.add.text(360, 92, "", {
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: "15px",
        color: "#e2e8f0",
        align: "center",
        stroke: "#171126",
        strokeThickness: 3,
      });
      this.spellText.setOrigin(0.5).setDepth(20);

      this.warrior = this.add.sprite(135, this.groundY, "warrior-idle");
      this.warrior
        .setScale(this.characterScale)
        .setDepth(6)
        .play("warrior-idle");

      this.wizard = this.add.sprite(585, this.groundY, "wizard-idle");
      this.wizard
        .setScale(this.characterScale)
        .setFlipX(true)
        .setDepth(6)
        .play("wizard-idle");

      this.shield = this.add
        .image(this.warrior.x + 68, this.warrior.y + 2, "shield")
        .setScale(0.2)
        .setAlpha(0)
        .setVisible(false)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(10);
    }

    private delay(duration: number): Promise<void> {
      return new Promise((resolve) => {
        this.time.delayedCall(duration, resolve);
      });
    }

    private tweenTo(config: Phaser.Types.Tweens.TweenBuilderConfig) {
      return new Promise<void>((resolve) => {
        this.tweens.add({
          ...config,
          onComplete: () => resolve(),
        });
      });
    }

    private parseSequence(value: string): string[] {
      const sequence = String(value ?? "");
      return sequence === "" ? [] : sequence.split("*");
    }

    private getSpellType(value: string): "fire" | "ice" {
      return value === "cau_bang" ? "ice" : "fire";
    }

    private getShieldType(value: string | undefined): "fire" | "ice" | null {
      if (value === "khien_lua") return "fire";
      if (value === "khien_bang") return "ice";
      return null;
    }

    private getShieldName(type: "fire" | "ice") {
      return type === "fire" ? "KHIÊN LỬA" : "KHIÊN BĂNG";
    }

    private getInvalidActionLabel(value: string | undefined) {
      if (value === undefined || value === "") return "KHÔNG CÓ KHIÊN";
      const compactValue =
        value.length > 20 ? `${value.slice(0, 20)}...` : value;
      return `LỆNH LẠ: ${compactValue}`;
    }

    private async activateShield(type: "fire" | "ice") {
      if (!this.shield || !this.warrior) return;

      const tint = type === "fire" ? 0xff6b35 : 0x65dcff;
      this.shield
        .setPosition(this.warrior.x + 68, this.warrior.y + 2)
        .setTint(tint)
        .setVisible(true)
        .setAlpha(0)
        .setScale(0.25);

      await this.tweenTo({
        targets: this.shield,
        alpha: 0.95,
        scale: 1.35,
        duration: 150,
        ease: "Back.easeOut",
      });
    }

    private async dismissShield() {
      if (!this.shield?.visible) return;

      await this.tweenTo({
        targets: this.shield,
        alpha: 0,
        scale: 1.65,
        duration: 150,
        ease: "Quad.easeOut",
      });
      this.shield.setVisible(false);
    }

    private playHitEffect(x: number, y: number, tint?: number) {
      const hit = this.add
        .sprite(x, y, "hit-effect")
        .setScale(2.4)
        .setDepth(15);
      if (tint) hit.setTint(tint);
      hit.play("hit-effect");
      hit.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        hit.destroy();
      });
    }

    private async castSpell(
      spell: string,
      shieldAction: string | undefined,
      turn: number,
      total: number,
    ): Promise<boolean> {
      if (!this.wizard || !this.warrior) return false;

      const spellType = this.getSpellType(spell);
      const shieldType = this.getShieldType(shieldAction);
      const shouldBlock = shieldType === spellType;
      const spellName = spellType === "fire" ? "CẦU LỬA" : "CẦU BĂNG";
      const shieldLabel = shieldType
        ? `${this.getShieldName(shieldType)}${shouldBlock ? "" : " (SAI LOẠI)"}`
        : this.getInvalidActionLabel(shieldAction);
      this.spellText.setText(
        `Đòn ${turn + 1}/${total}: ${spellName} → ${shieldLabel}`,
      );
      this.spellText.setColor(spellType === "fire" ? "#ffb36b" : "#9fe8ff");

      if (shieldType) {
        await this.activateShield(shieldType);
      } else {
        this.shield?.setVisible(false).setAlpha(0);
      }

      if (attackSound) attackSound.play({ volume: 0.55 });
      this.wizard.play("wizard-attack", true);
      await this.delay(260);

      const projectile = this.add
        .sprite(
          this.wizard.x - 64,
          this.wizard.y - 2,
          spellType === "fire" ? "fireball-1" : "iceball-1",
        )
        .setScale(2.2)
        .setFlipX(true)
        .setDepth(12);
      projectile.play(spellType === "fire" ? "fireball-fly" : "iceball-fly");

      const impactX = shouldBlock ? this.warrior.x + 68 : this.warrior.x + 10;
      await this.tweenTo({
        targets: projectile,
        x: impactX,
        y: this.warrior.y,
        duration: 620,
        ease: "Linear",
      });

      projectile.destroy();
      this.playHitEffect(
        impactX,
        this.warrior.y,
        spellType === "fire" ? 0xff8a3d : 0x8be9ff,
      );

      if (shouldBlock) {
        this.cameras.main.shake(90, 0.0025);
        await this.tweenTo({
          targets: this.shield,
          alpha: 0.45,
          scale: 1.5,
          duration: 90,
          yoyo: true,
        });
        await this.dismissShield();
      } else {
        this.cameras.main.shake(180, 0.008);
        if (shieldType) {
          await this.dismissShield();
        }
      }

      this.wizard.play("wizard-idle", true);
      await this.delay(180);
      return shouldBlock;
    }

    private async makeCharacterFall(
      target: Phaser.GameObjects.Sprite,
      direction: number,
      tint: number,
    ) {
      target.stop();
      target.setTint(tint);
      await this.tweenTo({
        targets: target,
        x: target.x + direction * 55,
        y: this.scale.gameSize.height + 130,
        angle: direction * 30,
        alpha: 0.35,
        duration: 780,
        ease: "Quad.easeIn",
      });
      target.setVisible(false);
    }

    private async killWarrior() {
      if (!this.warrior) return;
      await this.makeCharacterFall(this.warrior, -1, 0xff8c8c);
    }

    private async failFromExtraAction(action: string | undefined) {
      if (!this.warrior) return;

      const shieldType = this.getShieldType(action);
      const actionLabel = shieldType
        ? this.getShieldName(shieldType)
        : this.getInvalidActionLabel(action);
      this.spellText.setText(`Hành động thừa: ${actionLabel}`);
      this.spellText.setColor("#ff8fa3");

      if (shieldType) {
        await this.activateShield(shieldType);
        await this.tweenTo({
          targets: this.shield,
          scale: 2.1,
          alpha: 0.25,
          angle: 20,
          duration: 260,
          ease: "Back.easeIn",
        });
      } else {
        await this.delay(300);
      }

      this.playHitEffect(
        this.warrior.x + 35,
        this.warrior.y,
        shieldType === "ice" ? 0x8be9ff : 0xff8a6b,
      );
      this.cameras.main.shake(220, 0.01);
      this.shield?.setVisible(false).setAlpha(0);
      await this.killWarrior();
    }

    private async warriorDefeatsWizard() {
      if (!this.warrior || !this.wizard) return;

      await this.dismissShield();
      this.spellText.setText("Hiệp sĩ phản công!");
      this.spellText.setColor("#fde68a");

      await this.tweenTo({
        targets: this.warrior,
        alpha: 0,
        scale: 0.65,
        duration: 170,
        ease: "Quad.easeIn",
      });
      this.warrior.setPosition(this.wizard.x - 86, this.wizard.y);
      await this.tweenTo({
        targets: this.warrior,
        alpha: 1,
        scale: this.characterScale,
        duration: 180,
        ease: "Back.easeOut",
      });

      if (attackSound) attackSound.play({ volume: 0.55 });
      this.warrior.play("warrior-attack", true);
      await this.delay(310);
      this.playHitEffect(this.wizard.x - 8, this.wizard.y, 0xfff0a8);
      this.cameras.main.shake(160, 0.007);
      await this.makeCharacterFall(this.wizard, 1, 0xffb0b0);
      this.warrior.play("warrior-idle", true);
    }

    private async runBattle(result: any): Promise<boolean> {
      const testCase = GAME_CONFIG.testCases[this.sceneIndex];
      const spells = this.parseSequence(testCase?.input || "");
      const actualActions = this.parseSequence(result?.actual || "");

      if (spells.length === 0) {
        if (actualActions.length === 0 && result?.passed) {
          await this.warriorDefeatsWizard();
          return true;
        }
        await this.failFromExtraAction(actualActions[0]);
        return false;
      }

      for (let index = 0; index < spells.length; index++) {
        const blocked = await this.castSpell(
          spells[index],
          actualActions[index],
          index,
          spells.length,
        );

        if (!blocked) {
          await this.killWarrior();
          return false;
        }
      }

      if (actualActions.length > spells.length) {
        await this.failFromExtraAction(actualActions[spells.length]);
        return false;
      }

      if (!result?.passed) {
        this.spellText.setText("Kết quả in ra không khớp chính xác");
        this.spellText.setColor("#ff8fa3");
        await this.killWarrior();
        return false;
      }

      await this.warriorDefeatsWizard();
      return true;
    }

    async showResult(result: any) {
      if (this.resultHandled) return;
      this.resultHandled = true;

      this.displayText.setText("⚔ ĐANG GIAO CHIẾN");
      this.displayText.setColor("#f8fafc");
      await this.delay(250);

      const survived = await this.runBattle(result);
      this.displayText.setText(survived ? "✓ PASS" : "✗ FAIL");
      this.displayText.setColor(survived ? "#55ef8b" : "#ff6b6b");

      if (survived) {
        if (correctSound) correctSound.play();
      } else {
        if (wrongSound) wrongSound.play();
      }
    }
  }

  // Preload Scene - load all assets once
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

      const basePath = "/python-basics/chapter-1/t10-cd-b12/id4";
      this.load.spritesheet("warrior-idle", `${basePath}/Warrior_Idle.png`, {
        frameWidth: 192,
        frameHeight: 192,
      });
      this.load.spritesheet(
        "warrior-attack",
        `${basePath}/Warrior_Attack1.png`,
        {
          frameWidth: 192,
          frameHeight: 192,
        },
      );
      this.load.spritesheet("wizard-idle", `${basePath}/Wizard_Idle.png`, {
        frameWidth: 192,
        frameHeight: 192,
      });
      this.load.spritesheet("wizard-attack", `${basePath}/Wizard_Attack.png`, {
        frameWidth: 192,
        frameHeight: 192,
      });
      this.load.spritesheet("hit-effect", `${basePath}/hit_effect_sheet.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
      this.load.image("shield", `${basePath}/shield.png`);
      this.load.image("fireball-1", `${basePath}/improved_fireball_001.png`);
      this.load.image("fireball-2", `${basePath}/improved_fireball_002.png`);
      this.load.image("fireball-3", `${basePath}/improved_fireball_003.png`);
      this.load.image("iceball-1", `${basePath}/iceball_001.png`);
      this.load.image("iceball-2", `${basePath}/iceball_002.png`);
      this.load.audio("attack", `${basePath}/attacksound.wav`);
      this.load.audio("correct", "/sound_global/correct.mp3");
      this.load.audio("wrong", "/sound_global/wrong.mp3");
    }

    create() {
      try {
        if (this.sound && this.sound.context) {
          const audioContext = this.sound.context;

          // Only initialize sounds if AudioContext is not closed
          if (audioContext.state !== "closed") {
            correctSound = this.sound.add("correct");
            wrongSound = this.sound.add("wrong");
            attackSound = this.sound.add("attack");

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

      this.anims.create({
        key: "warrior-idle",
        frames: this.anims.generateFrameNumbers("warrior-idle", {
          start: 0,
          end: 7,
        }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: "warrior-attack",
        frames: this.anims.generateFrameNumbers("warrior-attack", {
          start: 0,
          end: 3,
        }),
        frameRate: 9,
        repeat: 0,
      });
      this.anims.create({
        key: "wizard-idle",
        frames: this.anims.generateFrameNumbers("wizard-idle", {
          start: 0,
          end: 5,
        }),
        frameRate: 7,
        repeat: -1,
      });
      this.anims.create({
        key: "wizard-attack",
        frames: this.anims.generateFrameNumbers("wizard-attack", {
          start: 0,
          end: 5,
        }),
        frameRate: 10,
        repeat: 0,
      });
      this.anims.create({
        key: "fireball-fly",
        frames: [
          { key: "fireball-1" },
          { key: "fireball-2" },
          { key: "fireball-3" },
        ],
        frameRate: 12,
        repeat: -1,
      });
      this.anims.create({
        key: "iceball-fly",
        frames: [{ key: "iceball-1" }, { key: "iceball-2" }],
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: "hit-effect",
        frames: this.anims.generateFrameNumbers("hit-effect", {
          start: 0,
          end: 4,
        }),
        frameRate: 16,
        repeat: 0,
      });

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
    attackSound = null;
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
        if (!phaserGame) return;

        const sceneKey = `GameScene${sceneIndex}`;
        const targetScene =
          phaserGame.scene.getScene(sceneKey) || currentSceneInstance;
        const battle =
          targetScene && "showResult" in targetScene
            ? (targetScene as any).showResult(result)
            : Promise.resolve();

        Promise.resolve(battle).finally(() => {
          if (sceneIndex < GAME_CONFIG.testCases.length - 1) {
            nextSceneBtn.style.display = "block";

            const phaserRoot = document.getElementById("phaser-root");
            if (phaserRoot) {
              phaserRoot.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          } else {
            status.textContent = testResults.every((r) => r.passed)
              ? "🎉 Hoàn thành tất cả scenes!"
              : "❌ Một số test cases sai";
            testcaseTable.classList.add("visible");
          }
        });
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

      // print() adds one final newline. Remove only that newline so spaces,
      // casing, empty tokens and additional output remain meaningful.
      const normalizePrintedOutput = (value: unknown) =>
        String(value ?? "")
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n")
          .replace(/\n$/, "");
      const actualOutput = normalizePrintedOutput(capturedOutput);
      const expectedOutput = normalizePrintedOutput(testCase.expected);
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
        actualOutput
          .split("\n")
          .filter(Boolean)
          .forEach((line) => logLine(`  📤 Log: ${line}`));
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
  if (GAME_PATH !== "CHANGE_ME" && codeEditor) {
    setupContestSubmission(root, GAME_PATH, {
      getCode: () => codeEditor.getCode(),
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
  const exposedGameInstance = {
    getTestResults: getTestResults,
    getScore: getScore,
    getCode: () => codeEditor?.getCode() || "",
  };
  (window as any).gameInstance = exposedGameInstance;

  // Next.js giữ JavaScript đang chạy khi chuyển route. Chỉ cleanup khi
  // component game thực sự bị tháo khỏi DOM; chuyển tab không ảnh hưởng.
  let gameDisposed = false;
  const disposeGame = () => {
    if (gameDisposed) return;
    gameDisposed = true;
    routeObserver.disconnect();

    for (const sound of [attackSound, correctSound, wrongSound]) {
      if (!sound) continue;
      try {
        sound.stop();
        sound.destroy();
      } catch (error) {
        console.warn("Error stopping game sound:", error);
      }
    }
    attackSound = null;
    correctSound = null;
    wrongSound = null;

    if (phaserGame) {
      try {
        phaserGame.sound?.stopAll();
        phaserGame.destroy(true);
      } catch (error) {
        console.warn("Error destroying game on route change:", error);
      }
      phaserGame = null;
    }
    currentSceneInstance = null;

    if ((window as any).gameInstance === exposedGameInstance) {
      delete (window as any).gameInstance;
    }
  };

  const routeObserver = new MutationObserver(() => {
    if (!root.isConnected) {
      disposeGame();
    }
  });
  routeObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
