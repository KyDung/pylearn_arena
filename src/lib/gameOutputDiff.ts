type DiffPart = {
  value: string;
  changed: boolean;
};

const MAX_DIFF_CELLS = 1_000_000;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const appendPart = (parts: DiffPart[], value: string, changed: boolean) => {
  if (!value) return;

  const previous = parts[parts.length - 1];
  if (previous?.changed === changed) {
    previous.value += value;
    return;
  }

  parts.push({ value, changed });
};

const buildFallbackDiff = (expected: string[], actual: string[]) => {
  let prefixLength = 0;
  while (
    prefixLength < expected.length &&
    prefixLength < actual.length &&
    expected[prefixLength] === actual[prefixLength]
  ) {
    prefixLength++;
  }

  let suffixLength = 0;
  while (
    suffixLength < expected.length - prefixLength &&
    suffixLength < actual.length - prefixLength &&
    expected[expected.length - 1 - suffixLength] ===
      actual[actual.length - 1 - suffixLength]
  ) {
    suffixLength++;
  }

  const expectedParts: DiffPart[] = [];
  const actualParts: DiffPart[] = [];
  const prefix = expected.slice(0, prefixLength).join("");
  const expectedMiddle = expected
    .slice(prefixLength, expected.length - suffixLength)
    .join("");
  const actualMiddle = actual
    .slice(prefixLength, actual.length - suffixLength)
    .join("");
  const suffix = expected.slice(expected.length - suffixLength).join("");

  appendPart(expectedParts, prefix, false);
  appendPart(expectedParts, expectedMiddle, true);
  appendPart(expectedParts, suffix, false);
  appendPart(actualParts, prefix, false);
  appendPart(actualParts, actualMiddle, true);
  appendPart(actualParts, suffix, false);

  return { expectedParts, actualParts };
};

const buildCharacterDiff = (expectedValue: string, actualValue: string) => {
  const expected = Array.from(expectedValue);
  const actual = Array.from(actualValue);

  if (expected.length * actual.length > MAX_DIFF_CELLS) {
    return buildFallbackDiff(expected, actual);
  }

  const distance = Array.from(
    { length: expected.length + 1 },
    () => new Uint32Array(actual.length + 1),
  );

  for (let expectedIndex = 0; expectedIndex <= expected.length; expectedIndex++) {
    distance[expectedIndex][actual.length] = expected.length - expectedIndex;
  }
  for (let actualIndex = 0; actualIndex <= actual.length; actualIndex++) {
    distance[expected.length][actualIndex] = actual.length - actualIndex;
  }

  for (let expectedIndex = expected.length - 1; expectedIndex >= 0; expectedIndex--) {
    for (let actualIndex = actual.length - 1; actualIndex >= 0; actualIndex--) {
      if (expected[expectedIndex] === actual[actualIndex]) {
        distance[expectedIndex][actualIndex] =
          distance[expectedIndex + 1][actualIndex + 1];
        continue;
      }

      distance[expectedIndex][actualIndex] =
        Math.min(
          distance[expectedIndex + 1][actualIndex + 1],
          distance[expectedIndex + 1][actualIndex],
          distance[expectedIndex][actualIndex + 1],
        ) + 1;
    }
  }

  const expectedParts: DiffPart[] = [];
  const actualParts: DiffPart[] = [];
  let expectedIndex = 0;
  let actualIndex = 0;

  while (expectedIndex < expected.length && actualIndex < actual.length) {
    if (expected[expectedIndex] === actual[actualIndex]) {
      appendPart(expectedParts, expected[expectedIndex], false);
      appendPart(actualParts, actual[actualIndex], false);
      expectedIndex++;
      actualIndex++;
    } else if (
      distance[expectedIndex][actualIndex] ===
      distance[expectedIndex + 1][actualIndex + 1] + 1
    ) {
      appendPart(expectedParts, expected[expectedIndex], true);
      appendPart(actualParts, actual[actualIndex], true);
      expectedIndex++;
      actualIndex++;
    } else if (
      distance[expectedIndex][actualIndex] ===
      distance[expectedIndex + 1][actualIndex] + 1
    ) {
      appendPart(expectedParts, expected[expectedIndex], true);
      expectedIndex++;
    } else {
      appendPart(actualParts, actual[actualIndex], true);
      actualIndex++;
    }
  }

  while (expectedIndex < expected.length) {
    appendPart(expectedParts, expected[expectedIndex], true);
    expectedIndex++;
  }

  while (actualIndex < actual.length) {
    appendPart(actualParts, actual[actualIndex], true);
    actualIndex++;
  }

  return { expectedParts, actualParts };
};

const renderParts = (
  parts: DiffPart[],
  side: "expected" | "actual",
  isDifferent: boolean,
) => {
  if (parts.length === 0) {
    return isDifferent
      ? `<span class="game-output-diff game-output-diff-${side} game-output-diff-empty" title="Không có nội dung">∅</span>`
      : "";
  }

  return parts
    .map((part) => {
      const content = escapeHtml(part.value);
      if (!part.changed) return content;

      const title =
        side === "expected"
          ? "Nội dung đúng cần có"
          : "Nội dung output khác với expected";
      return `<span class="game-output-diff game-output-diff-${side}" title="${title}">${content}</span>`;
    })
    .join("");
};

export const renderGameOutputDiff = (
  expectedValue: unknown,
  actualValue: unknown,
) => {
  const expected = String(expectedValue ?? "").replace(/\r\n?/g, "\n");
  const actual = String(actualValue ?? "").replace(/\r\n?/g, "\n");
  const isDifferent = expected !== actual;

  if (!isDifferent) {
    const content = escapeHtml(expected);
    return { expectedHtml: content, actualHtml: content, isDifferent };
  }

  const { expectedParts, actualParts } = buildCharacterDiff(expected, actual);
  return {
    expectedHtml: renderParts(expectedParts, "expected", true),
    actualHtml: renderParts(actualParts, "actual", true),
    isDifferent,
  };
};

const OUTPUT_DIFF_STYLES = `
  .output-panel {
    overflow: auto !important;
    overflow-x: auto !important;
    white-space: pre !important;
    word-break: normal !important;
    overflow-wrap: normal !important;
  }
  .output-panel > div {
    white-space: pre !important;
  }
  .testcase-table {
    max-width: 100% !important;
    overflow-x: auto !important;
  }
  .testcase-table table {
    width: max-content !important;
    min-width: 100% !important;
    table-layout: auto !important;
  }
  .testcase-table th,
  .testcase-table td {
    word-break: normal !important;
    overflow-wrap: normal !important;
  }
  .testcase-table .input,
  .testcase-table .output {
    white-space: pre !important;
    word-break: normal !important;
    overflow-wrap: normal !important;
  }
  .game-output-diff {
    border-radius: 2px;
    padding: 0 1px;
    white-space: inherit;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  .game-output-diff-expected {
    background: #dcfce7;
    color: #166534;
    box-shadow: inset 0 -2px #22c55e;
  }
  .game-output-diff-actual {
    background: #fee2e2;
    color: #991b1b;
    box-shadow: inset 0 -2px #ef4444;
  }
  .game-output-diff-empty {
    display: inline-block;
    min-width: 1.25rem;
    text-align: center;
    font-style: italic;
  }
`;

export const enhanceGameOutputDiffTables = (root: HTMLElement) => {
  const style = document.createElement("style");
  style.dataset.gameOutputDiffStyles = "true";
  style.textContent = OUTPUT_DIFF_STYLES;
  root.appendChild(style);

  let updateScheduled = false;
  const updateRows = () => {
    updateScheduled = false;

    root.querySelectorAll<HTMLTableRowElement>("#testcase-body tr").forEach((row) => {
      if (row.dataset.outputDiffApplied === "true") return;

      const actualCell = row.querySelector<HTMLTableCellElement>("td.output");
      const expectedCell =
        actualCell?.previousElementSibling instanceof HTMLTableCellElement
          ? actualCell.previousElementSibling
          : null;
      if (!expectedCell || !actualCell) return;

      const expected = expectedCell.textContent ?? "";
      const actual = actualCell.textContent ?? "";
      const diff = renderGameOutputDiff(expected, actual);

      row.dataset.outputDiffApplied = "true";
      expectedCell.innerHTML = diff.expectedHtml;
      actualCell.innerHTML = diff.actualHtml;
      expectedCell.classList.toggle("has-output-diff", diff.isDifferent);
      actualCell.classList.toggle("has-output-diff", diff.isDifferent);
    });
  };

  const scheduleUpdate = () => {
    if (updateScheduled) return;
    updateScheduled = true;
    queueMicrotask(updateRows);
  };

  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(root, { childList: true, subtree: true });
  updateRows();

  return () => {
    observer.disconnect();
    style.remove();
  };
};
