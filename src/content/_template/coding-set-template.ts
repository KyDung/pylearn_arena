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
      title: "Bài 1. Tính tổng hai số",
      description: `BÀI TOÁN
Cho hai số nguyên a và b. Hãy tính tổng của hai số.

DỮ LIỆU VÀO
- Dòng 1 chứa số nguyên a.
- Dòng 2 chứa số nguyên b.

DỮ LIỆU RA
In ra giá trị a + b.`,
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
      title: "Bài 2. Kiểm tra số chẵn",
      description: `BÀI TOÁN
Cho số nguyên n. Hãy xác định n là số chẵn hay số lẻ.

DỮ LIỆU VÀO
Một dòng duy nhất chứa số nguyên n.

DỮ LIỆU RA
In ra Chan nếu n chẵn; ngược lại, in ra Le.`,
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
