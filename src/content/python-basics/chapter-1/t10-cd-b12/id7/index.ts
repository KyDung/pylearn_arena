import initCodingSet, {
  type CodingSetConfig,
  type PyodideRuntime,
} from "@/lib/codingSet";

export const CODING_SET_CONFIG: CodingSetConfig = {
  type: "coding-set",
  path: "python-basics/chapter-1/t10-cd-b12/id7",
  title: "Luyện tập split và join",
  description:
    "Bộ 2 bài luyện tập thao tác với list chuỗi bằng split() và join().",
  // CODING_SET_EXERCISES_START
  exercises: [
    {
      id: "bai-1-dem-so",
      title: "Bài 1. Đếm số phần tử",
      description:
        "YÊU CẦU\nCho một dãy số nguyên được nhập trên cùng một dòng. Hãy tách dãy số thành một list và in số phần tử của list.\n\nDỮ LIỆU VÀO\nMột dòng chứa các số nguyên, hai số liên tiếp được phân cách bởi một hoặc nhiều dấu cách.\n\nDỮ LIỆU RA\nIn ra số lượng số nguyên đã nhập.\n\nYÊU CẦU LẬP TRÌNH\nSử dụng split() để tách dữ liệu thành một list.",
      starterCode: "s = input()\n\n# Tách dãy số và in số phần tử\n",
      points: 10,
      ioExamples: [
        {
          input: "2 5 8 10",
          output: "4",
        },
      ],
      testCases: [
        {
          input: "2 5 8 10",
          expected: "4",
        },
        {
          input: "1   -3   7",
          expected: "3",
        },
        {
          input: "42",
          expected: "1",
        },
        {
          input: "-5 -4 -3 -2 -1",
          expected: "5",
        },
        {
          input: "0 10 0 -10 25 30",
          expected: "6",
        },
      ],
    },
    {
      id: "bai-2-join-chuoi",
      title: "Bài 2. Ghép các chuỗi trong list",
      description:
        "YÊU CẦU\nCho một dòng gồm các từ phân cách bởi dấu phẩy. Hãy tách các từ thành một list, sau đó ghép các phần tử của list thành một xâu duy nhất. Hai từ liên tiếp trong kết quả được phân cách bởi đúng một dấu cách.\n\nDỮ LIỆU VÀO\nMột dòng chứa các từ, hai từ liên tiếp được phân cách bởi dấu phẩy.\n\nDỮ LIỆU RA\nIn ra xâu nhận được sau khi ghép các từ.\n\nYÊU CẦU LẬP TRÌNH\nSử dụng split() để tạo list và join() để ghép các phần tử bằng một dấu cách.",
      starterCode: "",
      points: 10,
      ioExamples: [
        {
          input: "Hoc,Python,that,vui",
          output: "Hoc Python that vui",
        },
      ],
      testCases: [
        {
          input: "Hoc,Python,that,vui",
          expected: "Hoc Python that vui",
        },
        {
          input: "mot,hai,ba",
          expected: "mot hai ba",
        },
        {
          input: "Xin chao",
          expected: "Xin chao",
        },
        {
          input: "2026,lop12,Python",
          expected: "2026 lop12 Python",
        },
        {
          input: "a,b,c,d,e",
          expected: "a b c d e",
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
