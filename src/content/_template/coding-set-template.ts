import initCodingSet, {
  type CodingSetConfig,
  type PyodideRuntime,
} from "@/lib/codingSet";

export const CODING_SET_CONFIG: CodingSetConfig = {
  type: "coding-set",
  path: "CHANGE_ME",
  title: "Bộ bài tập Python",
  description: "Làm từng bài, chấm kết quả và theo dõi tổng điểm.",
  // CODING_SET_EXERCISES_START
  exercises: [
    {
      id: "bai-1",
      title: "Tính tổng hai số",
      description:
        "Nhập hai số nguyên trên hai dòng. In ra tổng của hai số đó.",
      starterCode: "",
      points: 10,
      ioExamples: [
        {
          input: "2\n3",
          output: "5",
        },
      ],
      testCases: [
        {
          input: "2\n3",
          expected: "5",
          description: "Hai số dương",
        },
        {
          input: "-2\n5",
          expected: "3",
          description: "Có số âm",
        },
      ],
    },
    {
      id: "bai-2",
      title: "Kiểm tra số chẵn",
      description:
        'Nhập một số nguyên. In ra "Chan" nếu số đó chẵn, ngược lại in ra "Le".',
      starterCode: "",
      points: 10,
      ioExamples: [
        {
          input: "8",
          output: "Chan",
        },
      ],
      testCases: [
        {
          input: "8",
          expected: "Chan",
          description: "Số chẵn",
        },
        {
          input: "7",
          expected: "Le",
          description: "Số lẻ",
        },
      ],
    },
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
