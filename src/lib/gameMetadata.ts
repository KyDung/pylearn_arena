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

export const buildGameMetadataStyles = () => `
  .game-description { color: #4b5563; line-height: 1.625; white-space: pre-line; margin: 0; }
  .game-io-table-wrap { margin-top: 1rem; overflow-x: auto; border: 1px solid #dbeafe; border-radius: 0.75rem; background: #ffffff; }
  .game-io-table { width: 100%; border-collapse: collapse; min-width: 320px; font-size: 0.875rem; }
  .game-io-table th { background: #eff6ff; color: #1d4ed8; font-weight: 700; text-align: left; padding: 0.75rem; border-bottom: 1px solid #dbeafe; }
  .game-io-table td { color: #1f2937; padding: 0.75rem; border-top: 1px solid #eef2ff; vertical-align: top; white-space: pre-wrap; word-break: break-word; }
  .game-io-table td:first-child { border-right: 1px solid #eef2ff; }
`;

export const renderGameMetadata = (
  description: string,
  ioExamples: GameIOExample[] = [],
) => {
  const rows = ioExamples.filter(
    (row) => row && (String(row.input ?? "").trim() || String(row.output ?? "").trim()),
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
                  <td>${escapeHtml(row.input ?? "")}</td>
                  <td>${escapeHtml(row.output ?? "")}</td>
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
