import initCodingSet, {
  type CodingSetConfig,
  type PyodideRuntime,
} from "@/lib/codingSet";

export const CODING_SET_CONFIG: CodingSetConfig = {
  type: "coding-set",
  path: "python-basics/chapter-1/t10-cd-b12/id6",
  title: "Tí chỉnh",
  description: "Làm từng bài, chấm kết quả và theo dõi tổng điểm.",
  // CODING_SET_EXERCISES_START
  exercises: [
    {
      "id": "bai-1",
      "title": "Bài 1",
      "description": "",
      "starterCode": "",
      "points": 10,
      "ioExamples": [
        {
          "input": "Hoc lap trinh Python",
          "output": "4"
        }
      ],
      "testCases": [
        {
          input: "Hoc lap trinh Python",
          expected: "4",
          description: "Test case 1",
        }
      ]
    }
  ],
  // CODING_SET_EXERCISES_END
};

export default function initGame(
  root: HTMLElement,
  options: {
    pyodide: PyodideRuntime;
  },
) {
  return initCodingSet(root, {
    pyodide: options.pyodide,
    config: CODING_SET_CONFIG,
  });
}
