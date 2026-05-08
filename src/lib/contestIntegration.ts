/**
 * 🏆 Contest Integration Library
 *
 * Thư viện dùng chung cho TẤT CẢ games để tích hợp tính năng cuộc thi.
 * Import thư viện này vào game và gọi các hàm để:
 * 1. Kiểm tra game có đang mở cuộc thi không
 * 2. Hiển thị nút "Nộp code"
 * 3. Gửi bài nộp lên server
 *
 * @example
 * import { initContestFeature, submitToContest } from '@/lib/contestIntegration';
 *
 * // Trong initGame():
 * const contestInfo = await initContestFeature(root, gamePath);
 * if (contestInfo.isInContest) {
 *   // Game đang trong cuộc thi - hiển thị nút nộp
 * }
 *
 * // Khi hoàn thành game:
 * await submitToContest(contestInfo, { score, code, passedTests, totalTests });
 */

// ============================================================
// TYPES
// ============================================================

export interface ContestInfo {
  isInContest: boolean;
  contest: {
    id: number;
    title: string;
    contestCode: string;
    allowResubmit: boolean;
    maxAttempts: number | null;
    showRanking: boolean;
    endTime: string | null;
  } | null;
  gameId: number | null;
  userBestSubmission: {
    score: number;
    passedTests: number;
    totalTests: number;
    attemptNumber: number;
    submittedAt: string;
  } | null;
  rankings: Array<{
    rank_position: number;
    username: string;
    full_name: string;
    score: number;
    submitted_at: string;
  }> | null;
}

export interface SubmissionData {
  score: number;
  code: string;
  passedTests?: number;
  totalTests?: number;
  isCorrect?: boolean;
  executionTime?: number;
}

export interface SubmissionResult {
  success: boolean;
  submission?: {
    id: number;
    score: number;
    attemptNumber: number;
  };
  rankings?: Array<{
    rank_position: number;
    username: string;
    full_name: string;
    score: number;
  }>;
  error?: string;
}

// ============================================================
// STYLES
// ============================================================

export const buildContestStyles = () => `
  /* Contest Submit Button */
  .contest-submit-container {
    margin-top: 12px;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 8px;
    text-align: center;
  }
  
  .contest-info {
    color: white;
    font-size: 14px;
    margin-bottom: 8px;
  }
  
  .contest-info .contest-title {
    font-weight: 700;
    font-size: 16px;
    display: block;
    margin-bottom: 4px;
  }
  
  .contest-info .contest-code {
    background: rgba(255,255,255,0.2);
    padding: 2px 8px;
    border-radius: 4px;
    font-family: monospace;
  }
  
  .contest-submit-btn {
    background: #10b981;
    color: white;
    border: none;
    padding: 12px 24px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  
  .contest-submit-btn:hover {
    background: #059669;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
  
  .contest-submit-btn:disabled {
    background: #6b7280;
    cursor: not-allowed;
    transform: none;
  }
  
  .contest-submit-btn.submitting {
    background: #f59e0b;
  }
  
  .contest-submit-btn.submitted {
    background: #10b981;
  }
  
  /* Best Score Display */
  .contest-best-score {
    margin-top: 8px;
    padding: 8px;
    background: rgba(255,255,255,0.1);
    border-radius: 4px;
    color: white;
    font-size: 13px;
  }
  
  .contest-best-score .score {
    font-weight: 700;
    font-size: 18px;
    color: #fbbf24;
  }
  
  /* Rankings Table */
  .contest-rankings {
    margin-top: 12px;
    background: white;
    border-radius: 8px;
    padding: 12px;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .contest-rankings h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #374151;
  }
  
  .contest-rankings table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  
  .contest-rankings th,
  .contest-rankings td {
    padding: 6px 8px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .contest-rankings th {
    background: #f3f4f6;
    font-weight: 600;
  }
  
  .contest-rankings tr.current-user {
    background: #fef3c7;
  }
  
  .contest-rankings .rank-1 { color: #f59e0b; font-weight: 700; }
  .contest-rankings .rank-2 { color: #9ca3af; font-weight: 600; }
  .contest-rankings .rank-3 { color: #b45309; font-weight: 600; }
`;

// ============================================================
// HTML BUILDERS
// ============================================================

export const buildContestHTML = (
  contestInfo: ContestInfo,
  currentUsername?: string,
): string => {
  if (!contestInfo.isInContest || !contestInfo.contest) {
    return "";
  }

  const { contest, userBestSubmission, rankings } = contestInfo;

  // Best score display
  const bestScoreHTML = userBestSubmission
    ? `<div class="contest-best-score">
         Điểm cao nhất: <span class="score">${userBestSubmission.score}</span>
         (${userBestSubmission.passedTests}/${userBestSubmission.totalTests} tests)
         - Lần ${userBestSubmission.attemptNumber}
       </div>`
    : "";

  // Rankings table
  let rankingsHTML = "";
  if (contest.showRanking && rankings && rankings.length > 0) {
    const rows = rankings
      .map((r, i) => {
        const isCurrentUser = r.username === currentUsername;
        const rankClass = r.rank_position <= 3 ? `rank-${r.rank_position}` : "";
        return `<tr class="${isCurrentUser ? "current-user" : ""}">
        <td class="${rankClass}">#${r.rank_position}</td>
        <td>${r.full_name || r.username}</td>
        <td>${r.score}</td>
      </tr>`;
      })
      .join("");

    rankingsHTML = `
      <div class="contest-rankings">
        <h4>🏆 Bảng xếp hạng</h4>
        <table>
          <thead><tr><th>Hạng</th><th>Tên</th><th>Điểm</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // Submit button text
  const submitText =
    userBestSubmission && !contest.allowResubmit
      ? "✓ Đã nộp"
      : "📤 Nộp code cuộc thi";

  const canSubmit = contest.allowResubmit || !userBestSubmission;
  const attemptsInfo = contest.maxAttempts
    ? `(${userBestSubmission?.attemptNumber || 0}/${contest.maxAttempts} lượt)`
    : "";

  return `
    <div class="contest-submit-container" id="contest-container">
      <div class="contest-info">
        <span class="contest-title">🏆 ${contest.title}</span>
        Mã: <span class="contest-code">${contest.contestCode}</span>
        ${attemptsInfo}
      </div>
      <button class="contest-submit-btn" id="contest-submit-btn" ${canSubmit ? "" : "disabled"}>
        ${submitText}
      </button>
      ${bestScoreHTML}
      ${rankingsHTML}
    </div>
  `;
};

// ============================================================
// API FUNCTIONS
// ============================================================

/**
 * Kiểm tra game có đang trong cuộc thi không
 */
export async function checkContestStatus(
  gamePath: string,
): Promise<ContestInfo> {
  try {
    const response = await fetch(
      `/api/games/${encodeURIComponent(gamePath)}/contest-status`,
      {
        method: "GET",
        credentials: "include",
      },
    );

    if (!response.ok) {
      console.warn("Contest status check failed:", response.status);
      return {
        isInContest: false,
        contest: null,
        gameId: null,
        userBestSubmission: null,
        rankings: null,
      };
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error("Error checking contest status:", error);
    return {
      isInContest: false,
      contest: null,
      gameId: null,
      userBestSubmission: null,
      rankings: null,
    };
  }
}

/**
 * Nộp bài vào cuộc thi
 */
export async function submitToContest(
  contestInfo: ContestInfo,
  submission: SubmissionData,
): Promise<SubmissionResult> {
  if (!contestInfo.isInContest || !contestInfo.contest || !contestInfo.gameId) {
    return { success: false, error: "Game không trong cuộc thi" };
  }

  try {
    const response = await fetch(
      `/api/contests/${contestInfo.contest.id}/submit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          gameId: contestInfo.gameId,
          code: submission.code,
          score: submission.score,
          passedTests: submission.passedTests || 0,
          totalTests: submission.totalTests || 0,
          isCorrect: submission.isCorrect || false,
          executionTime: submission.executionTime,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Lỗi khi nộp bài",
      };
    }

    return {
      success: true,
      submission: data.data?.submission,
      rankings: data.data?.rankings,
    };
  } catch (error) {
    console.error("Error submitting to contest:", error);
    return {
      success: false,
      error: "Lỗi kết nối server",
    };
  }
}

// ============================================================
// GAME INTEGRATION
// ============================================================

/**
 * Khởi tạo tính năng cuộc thi cho game
 *
 * @param root - Element gốc của game
 * @param gamePath - Đường dẫn game (vd: "python-basics/chapter-1/t10-cd-b12/id1")
 * @param options - Tùy chọn
 * @returns ContestInfo và các hàm helper
 *
 * @example
 * const { contestInfo, submitScore } = await initContestFeature(root, gamePath);
 *
 * // Khi hoàn thành game:
 * await submitScore({ score: 100, code: userCode, passedTests: 3, totalTests: 3 });
 */
export async function initContestFeature(
  root: HTMLElement,
  gamePath: string,
  options?: {
    insertAfter?: string; // Selector để insert nút submit sau đó
    onSubmitStart?: () => void;
    onSubmitSuccess?: (result: SubmissionResult) => void;
    onSubmitError?: (error: string) => void;
    autoGetCode?: () => string; // Hàm tự lấy code từ editor
  },
): Promise<{
  contestInfo: ContestInfo;
  submitScore: (data: SubmissionData) => Promise<SubmissionResult>;
  updateRankings: (rankings: any[]) => void;
  isInContest: boolean;
}> {
  // Kiểm tra trạng thái cuộc thi
  const contestInfo = await checkContestStatus(gamePath);

  // Nếu có cuộc thi, inject UI
  if (contestInfo.isInContest) {
    // Inject styles
    const styleEl = document.createElement("style");
    styleEl.textContent = buildContestStyles();
    root.appendChild(styleEl);

    // Tìm vị trí để insert
    let insertTarget = root;
    if (options?.insertAfter) {
      const target = root.querySelector(options.insertAfter);
      if (target) {
        insertTarget = target as HTMLElement;
      }
    }

    // Get current username from page if possible
    const currentUsername =
      document
        .querySelector("[data-username]")
        ?.getAttribute("data-username") || undefined;

    // Inject HTML
    const containerDiv = document.createElement("div");
    containerDiv.innerHTML = buildContestHTML(contestInfo, currentUsername);
    if (options?.insertAfter) {
      insertTarget.insertAdjacentHTML(
        "afterend",
        buildContestHTML(contestInfo, currentUsername),
      );
    } else {
      // Find a good place - after code editor or at the end
      const codePanel =
        root.querySelector(".code-panel") || root.querySelector(".lesson-side");
      if (codePanel) {
        codePanel.insertAdjacentHTML(
          "beforeend",
          buildContestHTML(contestInfo, currentUsername),
        );
      } else {
        root.insertAdjacentHTML(
          "beforeend",
          buildContestHTML(contestInfo, currentUsername),
        );
      }
    }
  }

  // Hàm submit helper
  const submitScore = async (
    data: SubmissionData,
  ): Promise<SubmissionResult> => {
    if (!contestInfo.isInContest) {
      return { success: false, error: "Không có cuộc thi" };
    }

    const submitBtn = root.querySelector(
      "#contest-submit-btn",
    ) as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "⏳ Đang nộp...";
      submitBtn.classList.add("submitting");
    }

    options?.onSubmitStart?.();

    const result = await submitToContest(contestInfo, data);

    if (submitBtn) {
      submitBtn.classList.remove("submitting");
      if (result.success) {
        submitBtn.textContent = "✓ Đã nộp thành công!";
        submitBtn.classList.add("submitted");
        setTimeout(() => {
          submitBtn.textContent = contestInfo.contest?.allowResubmit
            ? "📤 Nộp lại"
            : "✓ Đã nộp";
          submitBtn.disabled = !contestInfo.contest?.allowResubmit;
        }, 2000);

        // Update rankings
        if (result.rankings) {
          updateRankings(result.rankings);
        }

        options?.onSubmitSuccess?.(result);
      } else {
        submitBtn.textContent = "❌ Lỗi - Thử lại";
        submitBtn.disabled = false;
        options?.onSubmitError?.(result.error || "Lỗi không xác định");
      }
    }

    return result;
  };

  // Hàm cập nhật rankings
  const updateRankings = (rankings: any[]) => {
    const rankingsContainer = root.querySelector(".contest-rankings tbody");
    if (!rankingsContainer || !rankings) return;

    const currentUsername = document
      .querySelector("[data-username]")
      ?.getAttribute("data-username");

    rankingsContainer.innerHTML = rankings
      .map((r, i) => {
        const isCurrentUser = r.username === currentUsername;
        const rankClass = r.rank_position <= 3 ? `rank-${r.rank_position}` : "";
        return `<tr class="${isCurrentUser ? "current-user" : ""}">
        <td class="${rankClass}">#${r.rank_position}</td>
        <td>${r.full_name || r.username}</td>
        <td>${r.score}</td>
      </tr>`;
      })
      .join("");
  };

  // Setup click handler cho nút submit (nếu có autoGetCode)
  if (contestInfo.isInContest && options?.autoGetCode) {
    const submitBtn = root.querySelector("#contest-submit-btn");
    if (submitBtn) {
      submitBtn.addEventListener("click", async () => {
        const code = options.autoGetCode!();
        // Note: Score sẽ được set bởi game logic
        // Đây chỉ là handler mặc định, game có thể override
        console.log("Contest submit clicked, code length:", code.length);
      });
    }
  }

  return {
    contestInfo,
    submitScore,
    updateRankings,
    isInContest: contestInfo.isInContest,
  };
}

/**
 * Wrapper đơn giản để tích hợp nhanh vào game có sẵn
 *
 * @example
 * // Ở cuối initGame(), sau khi game chạy xong:
 * setupContestSubmission(root, gamePath, {
 *   getCode: () => codeInput.value,
 *   getScore: () => calculateScore(),
 *   getTestResults: () => ({ passed: passedCount, total: totalCount }),
 * });
 */
export async function setupContestSubmission(
  root: HTMLElement,
  gamePath: string,
  callbacks: {
    getCode: () => string;
    getScore: () => number;
    getTestResults?: () => { passed: number; total: number };
    onSubmitted?: (result: SubmissionResult) => void;
  },
): Promise<{ isInContest: boolean }> {
  const { contestInfo, submitScore, isInContest } = await initContestFeature(
    root,
    gamePath,
  );

  if (!isInContest) {
    return { isInContest: false };
  }

  // Setup submit button click
  const submitBtn = root.querySelector("#contest-submit-btn");
  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const code = callbacks.getCode();
      const score = callbacks.getScore();
      const tests = callbacks.getTestResults?.() || { passed: 0, total: 0 };

      const result = await submitScore({
        code,
        score,
        passedTests: tests.passed,
        totalTests: tests.total,
        isCorrect: tests.passed === tests.total && tests.total > 0,
      });

      callbacks.onSubmitted?.(result);
    });
  }

  return { isInContest: true };
}
