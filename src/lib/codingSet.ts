import {
  buildCodeEditorHTML,
  buildCodeEditorStyles,
  initCodeEditor,
  setupCodeFullscreen,
} from "@/lib/codeEditor";
import { renderGameOutputDiff } from "@/lib/gameOutputDiff";
import { isPyodideTimeout, withPyodideTimeout } from "@/lib/pyodideTimeout";

export interface CodingSetTestCase {
  input: string;
  expected: string;
  description?: string;
}

export interface CodingSetExercise {
  id: string;
  title: string;
  description: string;
  starterCode?: string;
  points?: number;
  ioExamples?: Array<{
    input: string;
    output: string;
  }>;
  testCases: CodingSetTestCase[];
}

export interface CodingSetConfig {
  type: "coding-set";
  path: string;
  title: string;
  description?: string;
  exercises: CodingSetExercise[];
}

interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
}

interface ExerciseResult {
  codeSnapshot: string;
  passedTests: number;
  totalTests: number;
  score: number;
  tests: TestResult[];
}

interface StoredCodingSetState {
  currentExerciseId?: string;
  codes?: Record<string, string>;
  results?: Record<string, ExerciseResult>;
}

interface CodingSetGameInstance {
  prepareSubmission: () => Promise<void>;
  getCode: () => string;
  getScore: () => number;
  getTestResults: () => {
    passed: number;
    total: number;
    passedTests: number;
    totalTests: number;
    score: number;
  };
  canSubmit: () => boolean;
  getIncompleteMessage: () => string;
}

export interface PyodideRuntime {
  runPython: (code: string) => unknown;
}

declare global {
  interface Window {
    codingSetGameInstance?: CodingSetGameInstance;
  }
}

const normalizeOutput = (value: unknown) =>
  String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n+$/, "");

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatMultiline = (value: string) =>
  escapeHtml(value).replaceAll("\n", "<br>");

const SESSION_SUBMIT_EVENT = "pylearn:submit-session";
const SESSION_SUBMIT_STATE_EVENT = "pylearn:session-submit-state";

function getStorageKey(config: CodingSetConfig) {
  let userId = "guest";

  try {
    const storedUser = JSON.parse(localStorage.getItem("pylearn-user") || "{}");
    userId = String(storedUser?.id || storedUser?.username || "guest");
  } catch {
    // A malformed user cache should not prevent exercises from loading.
  }

  return `coding-set:${config.path}:${userId}`;
}

function getExercisePoints(exercise: CodingSetExercise) {
  return Number.isFinite(exercise.points) ? Math.max(0, exercise.points!) : 10;
}

async function runExerciseTests(
  pyodide: PyodideRuntime,
  code: string,
  testCases: CodingSetTestCase[],
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const testCase of testCases) {
    const inputLines = String(testCase.input ?? "").split("\n");
    let capturedOutput = "";

    try {
      pyodide.runPython(`
import sys
from io import StringIO
_coding_set_input_lines = ${JSON.stringify(inputLines)}
_coding_set_input_index = [0]
def input(prompt=""):
    index = _coding_set_input_index[0]
    _coding_set_input_index[0] += 1
    return _coding_set_input_lines[index] if index < len(_coding_set_input_lines) else ""
_coding_set_output = StringIO()
sys.stdout = _coding_set_output
sys.stderr = _coding_set_output
`);

      withPyodideTimeout(pyodide, () => pyodide.runPython(code), 5000);
      capturedOutput = String(
        pyodide.runPython("_coding_set_output.getvalue()"),
      );

      const actual = normalizeOutput(capturedOutput);
      const expected = normalizeOutput(testCase.expected);
      results.push({
        input: testCase.input,
        expected: testCase.expected,
        actual,
        passed: actual === expected,
      });
    } catch (error) {
      const message = isPyodideTimeout(error)
        ? "Chương trình chạy quá thời gian cho phép."
        : error instanceof Error
          ? error.message
          : String(error);

      results.push({
        input: testCase.input,
        expected: testCase.expected,
        actual: normalizeOutput(capturedOutput),
        passed: false,
        error: message,
      });
    } finally {
      try {
        pyodide.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
for _coding_set_name in (
    "_coding_set_input_lines",
    "_coding_set_input_index",
    "_coding_set_output",
):
    globals().pop(_coding_set_name, None)
globals().pop("input", None)
`);
      } catch {
        // The next test recreates the isolated input/output hooks.
      }
    }
  }

  return results;
}

export default function initCodingSet(
  root: HTMLElement,
  options: {
    pyodide: PyodideRuntime;
    config: CodingSetConfig;
  },
) {
  const { pyodide, config } = options;

  if (!config.exercises.length) {
    root.innerHTML =
      '<div class="coding-set-empty">Bộ bài tập chưa có bài nào.</div>';
    return;
  }

  root.innerHTML = `
    <style>
      ${buildCodeEditorStyles()}

      .coding-set-shell {
        --cs-border: #d9e1ec;
        --cs-text: #172033;
        --cs-muted: #64748b;
        --cs-primary: #2563eb;
        --cs-success: #15803d;
        --cs-danger: #dc2626;
        display: grid;
        grid-template-columns: minmax(220px, 270px) minmax(0, 1fr);
        min-height: min(820px, calc(100vh - 130px));
        background: #ffffff;
        color: var(--cs-text);
        border: 1px solid var(--cs-border);
        border-radius: 8px;
        overflow: hidden;
      }

      .coding-set-sidebar {
        display: flex;
        flex-direction: column;
        min-width: 0;
        background: #f8fafc;
        border-right: 1px solid var(--cs-border);
      }

      .coding-set-heading {
        padding: 20px 18px 16px;
        border-bottom: 1px solid var(--cs-border);
      }

      .coding-set-heading h2 {
        margin: 0;
        font-size: 20px;
        line-height: 1.3;
      }

      .coding-set-heading p {
        margin: 8px 0 0;
        color: var(--cs-muted);
        font-size: 14px;
        line-height: 1.5;
      }

      .coding-set-progress {
        padding: 14px 18px;
        border-bottom: 1px solid var(--cs-border);
      }

      .coding-set-score {
        font-size: 22px;
        font-weight: 700;
      }

      .coding-set-progress-text {
        margin-top: 4px;
        color: var(--cs-muted);
        font-size: 13px;
      }

      .coding-set-nav {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 12px;
        overflow: auto;
      }

      .coding-set-nav-item {
        display: grid;
        grid-template-columns: 30px minmax(0, 1fr) auto;
        align-items: center;
        gap: 9px;
        width: 100%;
        min-height: 48px;
        padding: 8px 10px;
        color: var(--cs-text);
        text-align: left;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 6px;
        cursor: pointer;
      }

      .coding-set-nav-item:hover {
        background: #eef4ff;
      }

      .coding-set-nav-item.is-active {
        background: #e8f0ff;
        border-color: #9bbcf5;
      }

      .coding-set-nav-number {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #e2e8f0;
        font-size: 13px;
        font-weight: 700;
      }

      .coding-set-nav-item.is-passed .coding-set-nav-number {
        color: #ffffff;
        background: var(--cs-success);
      }

      .coding-set-nav-item.is-failed .coding-set-nav-number {
        color: #ffffff;
        background: var(--cs-danger);
      }

      .coding-set-nav-title {
        min-width: 0;
        overflow: hidden;
        font-size: 14px;
        font-weight: 600;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .coding-set-nav-score {
        color: var(--cs-muted);
        font-size: 12px;
        white-space: nowrap;
      }

      .coding-set-main {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .coding-set-toolbar {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 12px;
        min-height: 64px;
        padding: 10px 18px;
        border-bottom: 1px solid var(--cs-border);
      }

      .coding-set-position {
        color: var(--cs-muted);
        font-size: 14px;
      }

      .coding-set-navigation {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
      }

      .coding-set-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px 18px;
        background: #ffffff;
        border-top: 1px solid var(--cs-border);
      }

      .coding-set-button {
        min-height: 38px;
        padding: 8px 14px;
        color: var(--cs-text);
        font: inherit;
        font-weight: 600;
        background: #ffffff;
        border: 1px solid #bdc8d8;
        border-radius: 6px;
        cursor: pointer;
      }

      .coding-set-button:hover:not(:disabled) {
        background: #f1f5f9;
        border-color: #8292a8;
      }

      .coding-set-button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .coding-set-button.is-primary {
        color: #ffffff;
        background: var(--cs-primary);
        border-color: var(--cs-primary);
      }

      .coding-set-button.is-primary:hover:not(:disabled) {
        background: #1d4ed8;
        border-color: #1d4ed8;
      }

      .coding-set-button.is-reset {
        color: #b91c1c;
        border-color: #f0a5a5;
      }

      .coding-set-button.is-reset:hover:not(:disabled) {
        color: #991b1b;
        background: #fef2f2;
        border-color: #ef4444;
      }

      .coding-set-button[hidden] {
        display: none;
      }

      .coding-set-content {
        display: flex;
        flex: 1;
        flex-direction: column;
        min-height: 0;
        overflow: visible;
      }

      .coding-set-statement {
        padding: 20px 22px;
        overflow: visible;
        background: #fbfdff;
        border-bottom: 1px solid var(--cs-border);
      }

      .coding-set-statement h1 {
        margin: 0;
        font-size: 24px;
        line-height: 1.3;
      }

      .coding-set-description {
        margin-top: 14px;
        color: #334155;
        line-height: 1.65;
        white-space: pre-wrap;
      }

      .coding-set-points {
        display: inline-block;
        margin-top: 12px;
        padding: 4px 8px;
        color: #1e40af;
        font-size: 13px;
        font-weight: 700;
        background: #dbeafe;
        border-radius: 4px;
      }

      .coding-set-example {
        margin-top: 22px;
        max-width: 100%;
        overflow-x: auto;
      }

      .coding-set-example h3 {
        margin: 0 0 10px;
        font-size: 16px;
      }

      .coding-set-example-table,
      .coding-set-result-table {
        width: max-content;
        min-width: 100%;
        border-collapse: collapse;
      }

      .coding-set-example-table th,
      .coding-set-example-table td,
      .coding-set-result-table th,
      .coding-set-result-table td {
        padding: 10px;
        text-align: left;
        vertical-align: top;
        border: 1px solid var(--cs-border);
      }

      .coding-set-example-table th,
      .coding-set-result-table th {
        color: #475569;
        font-size: 12px;
        text-transform: uppercase;
        background: #f8fafc;
      }

      .coding-set-example-table code,
      .coding-set-result-table code {
        display: block;
        max-width: min(520px, 48vw);
        overflow-x: auto;
        font-family: "JetBrains Mono", Consolas, monospace;
        white-space: pre;
        word-break: normal;
        overflow-wrap: normal;
      }

      .coding-set-workspace {
        display: grid;
        flex: 1;
        grid-template-rows: minmax(360px, 1fr) auto auto;
        min-width: 0;
        min-height: 0;
      }

      .coding-set-workspace .code-panel {
        min-height: 360px;
        border: 0;
        border-radius: 0;
      }

      .coding-set-results {
        max-height: 330px;
        padding: 16px 18px 20px;
        overflow: auto;
        border-top: 1px solid var(--cs-border);
      }

      .coding-set-results-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 12px;
      }

      .coding-set-results-header h3 {
        margin: 0;
        font-size: 16px;
      }

      .coding-set-result-summary {
        font-size: 13px;
        font-weight: 700;
      }

      .coding-set-result-summary.is-passed {
        color: var(--cs-success);
      }

      .coding-set-result-summary.is-failed {
        color: var(--cs-danger);
      }

      .coding-set-status-pass {
        color: var(--cs-success);
        font-weight: 700;
      }

      .coding-set-status-fail,
      .coding-set-error {
        color: var(--cs-danger);
        font-weight: 700;
      }

      .coding-set-placeholder {
        padding: 18px;
        color: var(--cs-muted);
        text-align: center;
        background: #f8fafc;
        border: 1px dashed #bdc8d8;
        border-radius: 6px;
      }

      .coding-set-empty {
        padding: 30px;
        color: #64748b;
        text-align: center;
      }

      @media (max-width: 1050px) {
        .coding-set-shell {
          grid-template-columns: 1fr;
        }

        .coding-set-sidebar {
          border-right: 0;
          border-bottom: 1px solid var(--cs-border);
        }

        .coding-set-nav {
          flex-direction: row;
        }

        .coding-set-nav-item {
          min-width: 190px;
        }
      }

      @media (max-width: 640px) {
        .coding-set-toolbar {
          align-items: stretch;
          flex-direction: column;
        }

        .coding-set-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .coding-set-button.is-reset {
          grid-column: 1 / -1;
        }

        .coding-set-button {
          width: 100%;
        }

        .coding-set-workspace .code-panel {
          min-height: 420px;
        }
      }
    </style>

    <div class="coding-set-shell">
      <aside class="coding-set-sidebar">
        <div class="coding-set-heading">
          <h2>${escapeHtml(config.title)}</h2>
          ${config.description ? `<p>${escapeHtml(config.description)}</p>` : ""}
        </div>
        <div class="coding-set-progress">
          <div class="coding-set-score" id="coding-set-total-score">0 điểm</div>
          <div class="coding-set-progress-text" id="coding-set-progress-text"></div>
        </div>
        <nav class="coding-set-nav" id="coding-set-nav"></nav>
      </aside>

      <main class="coding-set-main">
        <div class="coding-set-toolbar">
          <div>
            <div class="coding-set-position" id="coding-set-position"></div>
            <div class="coding-set-navigation">
              <button class="coding-set-button" id="coding-set-prev" type="button">Bài trước</button>
              <button class="coding-set-button" id="coding-set-next" type="button">Bài sau</button>
            </div>
          </div>
        </div>

        <div class="coding-set-content">
          <section class="coding-set-statement">
            <h1 id="coding-set-exercise-title"></h1>
            <span class="coding-set-points" id="coding-set-exercise-points"></span>
            <div class="coding-set-description" id="coding-set-exercise-description"></div>
            <div class="coding-set-example" id="coding-set-examples"></div>
          </section>

          <section class="coding-set-workspace">
            <div class="code-panel">
              ${buildCodeEditorHTML("")}
            </div>
            <div class="coding-set-actions">
              <button class="coding-set-button is-reset" id="coding-set-reset-all" type="button" hidden>
                Làm lại toàn bộ
              </button>
              <button class="coding-set-button is-primary" id="coding-set-grade" type="button">
                Chạy code
              </button>
              <button class="coding-set-button" id="coding-set-grade-all" type="button" hidden>
                Chấm điểm
              </button>
            </div>
            <div class="coding-set-results" id="coding-set-results"></div>
          </section>
        </div>
      </main>
    </div>
  `;

  const storageKey = getStorageKey(config);
  let storedState: StoredCodingSetState = {};

  try {
    storedState = JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    storedState = {};
  }

  const codes: Record<string, string> = {};
  const results: Record<string, ExerciseResult> = {};

  for (const exercise of config.exercises) {
    codes[exercise.id] =
      storedState.codes?.[exercise.id] ?? exercise.starterCode ?? "";

    const storedResult = storedState.results?.[exercise.id];
    if (
      storedResult &&
      storedResult.codeSnapshot === codes[exercise.id] &&
      Array.isArray(storedResult.tests)
    ) {
      results[exercise.id] = storedResult;
    }
  }

  const restoredIndex = config.exercises.findIndex(
    (exercise) => exercise.id === storedState.currentExerciseId,
  );
  let currentIndex = restoredIndex >= 0 ? restoredIndex : 0;
  let grading = false;
  let destroyed = false;
  const isSessionMode = root.dataset.sessionMode === "true";
  let sessionSubmitting = root.dataset.sessionSubmitting === "true";
  let sessionSubmitted = root.dataset.sessionSubmitted === "true";

  const nav = root.querySelector<HTMLElement>("#coding-set-nav")!;
  const totalScore = root.querySelector<HTMLElement>(
    "#coding-set-total-score",
  )!;
  const progressText = root.querySelector<HTMLElement>(
    "#coding-set-progress-text",
  )!;
  const position = root.querySelector<HTMLElement>("#coding-set-position")!;
  const title = root.querySelector<HTMLElement>(
    "#coding-set-exercise-title",
  )!;
  const points = root.querySelector<HTMLElement>(
    "#coding-set-exercise-points",
  )!;
  const description = root.querySelector<HTMLElement>(
    "#coding-set-exercise-description",
  )!;
  const examples = root.querySelector<HTMLElement>(
    "#coding-set-examples",
  )!;
  const resultPanel = root.querySelector<HTMLElement>(
    "#coding-set-results",
  )!;
  const previousButton = root.querySelector<HTMLButtonElement>(
    "#coding-set-prev",
  )!;
  const nextButton = root.querySelector<HTMLButtonElement>(
    "#coding-set-next",
  )!;
  const gradeButton = root.querySelector<HTMLButtonElement>(
    "#coding-set-grade",
  )!;
  const gradeAllButton = root.querySelector<HTMLButtonElement>(
    "#coding-set-grade-all",
  )!;
  const resetAllButton = root.querySelector<HTMLButtonElement>(
    "#coding-set-reset-all",
  )!;
  const codeEditor = initCodeEditor(
    root,
    codes[config.exercises[currentIndex].id],
  );
  if (!codeEditor) {
    throw new Error("Không thể khởi tạo code editor cho bộ bài tập.");
  }
  codeEditor.setCode(codes[config.exercises[currentIndex].id]);
  setupCodeFullscreen(root);

  const saveState = () => {
    if (destroyed) return;

    const exercise = config.exercises[currentIndex];
    if (exercise) {
      codes[exercise.id] = codeEditor.getCode();
    }

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        currentExerciseId: exercise?.id,
        codes,
        results,
      } satisfies StoredCodingSetState),
    );
  };

  const getAggregate = () => {
    let passedTests = 0;
    let totalTests = 0;
    let score = 0;
    let maxScore = 0;
    let gradedExercises = 0;

    for (const exercise of config.exercises) {
      const result = results[exercise.id];
      const exerciseTests = exercise.testCases.length;
      const exercisePoints = getExercisePoints(exercise);
      totalTests += exerciseTests;
      maxScore += exercisePoints;

      if (result && result.codeSnapshot === codes[exercise.id]) {
        passedTests += result.passedTests;
        score += result.score;
        gradedExercises += 1;
      }
    }

    return {
      passedTests,
      totalTests,
      score,
      maxScore,
      gradedExercises,
    };
  };

  const renderSummary = () => {
    const aggregate = getAggregate();
    totalScore.textContent = `${Number(aggregate.score.toFixed(2))}/${Number(
      aggregate.maxScore.toFixed(2),
    )} điểm`;
    progressText.textContent = `${aggregate.gradedExercises}/${config.exercises.length} bài đã chấm · ${aggregate.passedTests}/${aggregate.totalTests} test đúng`;
  };

  const renderNavigation = () => {
    nav.innerHTML = config.exercises
      .map((exercise, index) => {
        const result = results[exercise.id];
        const isCurrent = index === currentIndex;
        const isCurrentResult =
          result && result.codeSnapshot === codes[exercise.id];
        const passed =
          isCurrentResult && result.passedTests === result.totalTests;
        const failed = isCurrentResult && !passed;
        const stateClass = passed
          ? "is-passed"
          : failed
            ? "is-failed"
            : "";
        const scoreText = isCurrentResult
          ? `${Number(result.score.toFixed(2))}/${getExercisePoints(exercise)}`
          : `-/${getExercisePoints(exercise)}`;

        return `
          <button
            class="coding-set-nav-item ${isCurrent ? "is-active" : ""} ${stateClass}"
            type="button"
            data-exercise-index="${index}"
            title="${escapeHtml(exercise.title)}"
          >
            <span class="coding-set-nav-number">${index + 1}</span>
            <span class="coding-set-nav-title">${escapeHtml(exercise.title)}</span>
            <span class="coding-set-nav-score">${scoreText}</span>
          </button>
        `;
      })
      .join("");
  };

  const renderExamples = (exercise: CodingSetExercise) => {
    if (!exercise.ioExamples?.length) {
      examples.innerHTML = "";
      return;
    }

    examples.innerHTML = `
      <h3>Ví dụ input/output</h3>
      <table class="coding-set-example-table">
        <thead>
          <tr>
            <th>Input</th>
            <th>Output</th>
          </tr>
        </thead>
        <tbody>
          ${exercise.ioExamples
            .map(
              (example) => `
                <tr>
                  <td><code>${formatMultiline(example.input)}</code></td>
                  <td><code>${formatMultiline(example.output)}</code></td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    `;
  };

  const renderResults = () => {
    const exercise = config.exercises[currentIndex];
    const result = results[exercise.id];
    const isCurrentResult =
      result && result.codeSnapshot === codes[exercise.id];

    if (!isCurrentResult) {
      resultPanel.innerHTML = `
        <div class="coding-set-placeholder">
          Chạy code để xem kết quả từng test case.
        </div>
      `;
      return;
    }

    const passed = result.passedTests === result.totalTests;
    resultPanel.innerHTML = `
      <div class="coding-set-results-header">
        <h3>Kết quả</h3>
        <span class="coding-set-result-summary ${passed ? "is-passed" : "is-failed"}">
          ${result.passedTests}/${result.totalTests} test đúng · ${Number(
            result.score.toFixed(2),
          )}/${getExercisePoints(exercise)} điểm
        </span>
      </div>
      <table class="coding-set-result-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Input</th>
            <th>Expected</th>
            <th>Output</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${result.tests
            .map((test, index) => {
              const diff = renderGameOutputDiff(test.expected, test.actual);
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td><code>${formatMultiline(test.input)}</code></td>
                  <td><code>${diff.expectedHtml.replaceAll("\n", "<br>")}</code></td>
                  <td>
                    ${
                      test.error
                        ? `<div class="coding-set-error">${escapeHtml(test.error)}</div>`
                        : `<code>${diff.actualHtml.replaceAll("\n", "<br>")}</code>`
                    }
                  </td>
                  <td class="${test.passed ? "coding-set-status-pass" : "coding-set-status-fail"}">
                    ${test.passed ? "Đúng" : "Sai"}
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  };

  const updateButtons = () => {
    const aggregate = getAggregate();
    const isLastExercise = currentIndex === config.exercises.length - 1;
    previousButton.disabled = grading || currentIndex === 0;
    nextButton.disabled =
      grading || currentIndex === config.exercises.length - 1;
    gradeButton.disabled = grading;
    gradeAllButton.disabled =
      grading || (isSessionMode && (sessionSubmitting || sessionSubmitted));
    gradeAllButton.hidden = !isLastExercise;
    gradeAllButton.classList.toggle("is-primary", isSessionMode);
    resetAllButton.disabled = grading;
    resetAllButton.hidden =
      aggregate.gradedExercises !== config.exercises.length;
    gradeButton.textContent = grading ? "Đang chạy..." : "Chạy code";
    gradeAllButton.textContent = isSessionMode
      ? sessionSubmitted
        ? "Đã nộp"
        : sessionSubmitting
          ? "Đang nộp..."
          : "Nộp bài"
      : grading
        ? "Đang chấm..."
        : "Chấm điểm";
  };

  const renderCurrentExercise = () => {
    const exercise = config.exercises[currentIndex];
    position.textContent = `Bài ${currentIndex + 1}/${config.exercises.length}`;
    title.textContent = exercise.title;
    points.textContent = `${getExercisePoints(exercise)} điểm`;
    description.textContent = exercise.description;
    renderExamples(exercise);
    renderResults();
    renderNavigation();
    renderSummary();
    updateButtons();
  };

  const switchExercise = (nextIndex: number) => {
    if (
      grading ||
      nextIndex < 0 ||
      nextIndex >= config.exercises.length ||
      nextIndex === currentIndex
    ) {
      return;
    }

    const currentExercise = config.exercises[currentIndex];
    codes[currentExercise.id] = codeEditor.getCode();
    currentIndex = nextIndex;
    const nextExercise = config.exercises[currentIndex];
    codeEditor.setCode(codes[nextExercise.id]);
    renderCurrentExercise();
    saveState();
  };

  const gradeExercise = async (exerciseIndex: number) => {
    const exercise = config.exercises[exerciseIndex];
    const code =
      exerciseIndex === currentIndex
        ? codeEditor.getCode()
        : codes[exercise.id];

    codes[exercise.id] = code;

    if (!code.trim()) {
      results[exercise.id] = {
        codeSnapshot: code,
        passedTests: 0,
        totalTests: exercise.testCases.length,
        score: 0,
        tests: exercise.testCases.map((testCase) => ({
          input: testCase.input,
          expected: testCase.expected,
          actual: "",
          passed: false,
          error: "Bạn chưa nhập code.",
        })),
      };
      return;
    }

    const tests = await runExerciseTests(pyodide, code, exercise.testCases);
    const passedTests = tests.filter((test) => test.passed).length;
    const totalTests = exercise.testCases.length;
    const ratio = totalTests ? passedTests / totalTests : 0;

    results[exercise.id] = {
      codeSnapshot: code,
      passedTests,
      totalTests,
      score: getExercisePoints(exercise) * ratio,
      tests,
    };
  };

  const gradeCurrentExercise = async () => {
    if (grading) return;
    grading = true;
    updateButtons();

    try {
      await gradeExercise(currentIndex);
    } finally {
      grading = false;
      renderCurrentExercise();
      saveState();
    }
  };

  const gradeAllExercises = async () => {
    if (grading) return;
    grading = true;
    updateButtons();

    try {
      codes[config.exercises[currentIndex].id] = codeEditor.getCode();
      for (let index = 0; index < config.exercises.length; index += 1) {
        await gradeExercise(index);
        renderNavigation();
        renderSummary();
      }
    } finally {
      grading = false;
      renderCurrentExercise();
      saveState();
    }
  };

  const resetAllExercises = () => {
    if (grading) return;

    const confirmed = window.confirm(
      "Làm lại toàn bộ sẽ xóa code, kết quả chấm và điểm đang lưu trên thiết bị. Bài đã nộp trong session (nếu có) không bị thay đổi. Bạn có muốn tiếp tục?",
    );
    if (!confirmed) return;

    for (const exercise of config.exercises) {
      codes[exercise.id] = exercise.starterCode ?? "";
      delete results[exercise.id];
    }

    currentIndex = 0;
    localStorage.removeItem(storageKey);
    codeEditor.setCode(codes[config.exercises[0].id]);
    renderCurrentExercise();
    saveState();
  };

  const editorElement = codeEditor.element;

  const handleEditorInput = () => {
    const exercise = config.exercises[currentIndex];
    codes[exercise.id] = codeEditor.getCode();
    const result = results[exercise.id];

    if (result && result.codeSnapshot !== codes[exercise.id]) {
      delete results[exercise.id];
    }

    renderNavigation();
    renderSummary();
    renderResults();
    updateButtons();
    saveState();
  };

  const handleNavClick = (event: Event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-exercise-index]",
    );
    if (!button) return;
    switchExercise(Number(button.dataset.exerciseIndex));
  };

  const requestSessionSubmit = () => {
    if (grading || sessionSubmitting || sessionSubmitted) return;
    window.dispatchEvent(new CustomEvent(SESSION_SUBMIT_EVENT));
  };

  const handleSessionSubmitState = (event: Event) => {
    const detail = (event as CustomEvent<{
      submitting?: boolean;
      submitted?: boolean;
    }>).detail;

    sessionSubmitting = Boolean(detail?.submitting);
    sessionSubmitted = Boolean(detail?.submitted);
    updateButtons();
  };

  editorElement.addEventListener("input", handleEditorInput);
  nav.addEventListener("click", handleNavClick);
  previousButton.addEventListener("click", () =>
    switchExercise(currentIndex - 1),
  );
  nextButton.addEventListener("click", () =>
    switchExercise(currentIndex + 1),
  );
  gradeButton.addEventListener("click", gradeCurrentExercise);
  gradeAllButton.addEventListener(
    "click",
    isSessionMode ? requestSessionSubmit : gradeAllExercises,
  );
  resetAllButton.addEventListener("click", resetAllExercises);
  window.addEventListener(SESSION_SUBMIT_STATE_EVENT, handleSessionSubmitState);

  const gameInstance: CodingSetGameInstance = {
    prepareSubmission: gradeAllExercises,
    getCode: () => {
      codes[config.exercises[currentIndex].id] = codeEditor.getCode();
      return JSON.stringify({
        type: "coding-set",
        contentPath: config.path,
        answers: config.exercises.map((exercise) => ({
          exerciseId: exercise.id,
          code: codes[exercise.id],
        })),
      });
    },
    getScore: () => {
      const aggregate = getAggregate();
      return aggregate.maxScore > 0
        ? Number(((aggregate.score / aggregate.maxScore) * 100).toFixed(2))
        : 0;
    },
    getTestResults: () => {
      const aggregate = getAggregate();
      return {
        passed: aggregate.passedTests,
        total: aggregate.totalTests,
        passedTests: aggregate.passedTests,
        totalTests: aggregate.totalTests,
        score: Number(aggregate.score.toFixed(2)),
      };
    },
    canSubmit: () =>
      config.exercises.every((exercise) => {
        const result = results[exercise.id];
        return result && result.codeSnapshot === codes[exercise.id];
      }),
    getIncompleteMessage: () =>
      "Bạn cần chấm điểm toàn bộ bài trước khi nộp bài kiểm tra.",
  };

  window.codingSetGameInstance = gameInstance;
  (window as Window & { gameInstance?: CodingSetGameInstance }).gameInstance =
    gameInstance;
  renderCurrentExercise();

  return () => {
    saveState();
    destroyed = true;
    editorElement.removeEventListener("input", handleEditorInput);
    nav.removeEventListener("click", handleNavClick);
    gradeButton.removeEventListener("click", gradeCurrentExercise);
    gradeAllButton.removeEventListener(
      "click",
      isSessionMode ? requestSessionSubmit : gradeAllExercises,
    );
    resetAllButton.removeEventListener("click", resetAllExercises);
    window.removeEventListener(
      SESSION_SUBMIT_STATE_EVENT,
      handleSessionSubmitState,
    );

    const gameWindow = window as Window & {
      gameInstance?: CodingSetGameInstance;
    };
    if (gameWindow.gameInstance === gameInstance) {
      delete gameWindow.gameInstance;
    }
    if (window.codingSetGameInstance === gameInstance) {
      delete window.codingSetGameInstance;
    }
  };
}
