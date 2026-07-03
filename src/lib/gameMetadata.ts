export interface GameIOExample {
  input: string;
  output: string;
}

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeTableText = (value: string) =>
  String(value ?? "")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

export const buildGameMetadataStyles = () => `
  .game-metadata .game-description,
  .lesson-header .game-description {
    margin: 0;
    color: #334155;
    font-size: 16px;
    line-height: 1.65;
    white-space: pre-line;
  }
  .game-io-table-wrap { max-width: 100%; margin-top: 1rem; overflow-x: auto; border: 1px solid #dbeafe; border-radius: 0.75rem; background: #ffffff; }
  .game-io-table { width: max-content; min-width: 100%; border-collapse: collapse; font-size: 0.875rem; }
  .game-io-table th { background: #eff6ff; color: #1d4ed8; font-weight: 700; text-align: left; padding: 0.75rem; border-bottom: 1px solid #dbeafe; }
  .game-io-table td { color: #1f2937; padding: 0.75rem; border-top: 1px solid #eef2ff; vertical-align: top; white-space: pre; word-break: normal; overflow-wrap: normal; }
  .game-io-table td:first-child { border-right: 1px solid #eef2ff; }
`;

export const renderGameMetadata = (
  description: string,
  ioExamples: GameIOExample[] = [],
) => {
  const rows = ioExamples.filter(
    (row) =>
      row &&
      (normalizeTableText(row.input).trim() ||
        normalizeTableText(row.output).trim()),
  );

  const tableHtml = rows.length
    ? `<div class="game-io-table-wrap">
        <table class="game-io-table">
          <thead>
            <tr>
              <th>Input</th>
              <th>Output</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `<tr>
                  <td>${escapeHtml(normalizeTableText(row.input))}</td>
                  <td>${escapeHtml(normalizeTableText(row.output))}</td>
                </tr>`,
              )
              .join("")}
          </tbody>
        </table>
      </div>`
    : "";

  return `<div class="game-metadata">
    <p class="game-description">${escapeHtml(description.trim())}</p>
    ${tableHtml}
  </div>`;
};
