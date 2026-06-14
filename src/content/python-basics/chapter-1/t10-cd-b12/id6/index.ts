import initCodingSet, {
  type CodingSetConfig,
  type PyodideRuntime,
} from "@/lib/codingSet";

export const CODING_SET_CONFIG: CodingSetConfig = {
  type: "coding-set",
  path: "python-basics/chapter-1/t10-cd-b12/id6",
  title: "Luyện tập xử lý chuỗi trong Python",
  description:
    "Bộ 5 bài luyện tập tăng dần độ khó về toán tử in, các phương thức find(), split(), join() và kiến thức if/else, for, while, list.",
  // CODING_SET_EXERCISES_START
  exercises: [
    {
      id: "bai-1-tach-ho-ten",
      title: "Bài1. Tách họ tên",
      description: "YÊU CẦU\nViết chương trình nhập họ tên đầy đủ của một người. Hãy xác định tên và phần họ đệm của người đó.\n\nDỮ LIỆU VÀO\nMột dòng chứa họ tên đầy đủ. Họ tên có ít nhất hai từ; giữa các từ có thể có một hoặc nhiều dấu cách.\n\nDỮ LIỆU RA\n- Dòng 1 in thông báo theo mẫu: Ten: <tên>.\n- Dòng 2 in thông báo theo mẫu: Ho dem: <họ và tên đệm>.\n\nYÊU CẦU LẬP TRÌNH\nSử dụng split() để tách họ tên thành một list và join() để ghép phần họ đệm.",
      starterCode: "ho_ten = input()\n\n# Tách họ tên thành các từ\n\n# In tên và họ đệm theo đúng định dạng\n",
      points: 10,
      ioExamples: [
        {
          input: "Nguyen Van An",
          output: "Ten: An\nHo dem: Nguyen Van",
        },
        {
          input: "Tran Thi Mai",
          output: "Ten: Mai\nHo dem: Tran Thi",
        }
      ],
      testCases: [
        {
          input: "Nguyen Van An",
          expected: "Ten: An\nHo dem: Nguyen Van",
          description: "Họ tên gồm ba từ",
        },
        {
          input: "Tran Thi Mai",
          expected: "Ten: Mai\nHo dem: Tran Thi",
          description: "Họ tên nữ gồm ba từ",
        },
        {
          input: "Le Minh",
          expected: "Ten: Minh\nHo dem: Le",
          description: "Họ tên gồm hai từ",
        },
        {
          input: "Pham Ngoc Anh Thu",
          expected: "Ten: Thu\nHo dem: Pham Ngoc Anh",
          description: "Họ tên gồm bốn từ",
        },
        {
          input: "  Do   Hoang   Long  ",
          expected: "Ten: Long\nHo dem: Do Hoang",
          description: "Họ tên có nhiều dấu cách",
        }
      ],
    },
    {
      id: "bai-2-email",
      title: "Bài 2. Tách địa chỉ email",
      description: "YÊU CẦU\nCho một địa chỉ email hợp lệ. Hãy tách địa chỉ email thành tên đăng nhập và tên miền. Tên đăng nhập là phần đứng trước ký tự @, tên miền là phần đứng sau ký tự @.\n\nDỮ LIỆU VÀO\nMột dòng duy nhất chứa địa chỉ email. Địa chỉ email có đúng một ký tự @; phần tên đăng nhập và tên miền đều không rỗng.\n\nDỮ LIỆU RA\n- Dòng 1 in tên đăng nhập.\n- Dòng 2 in tên miền.\n\nYÊU CẦU LẬP TRÌNH\nSử dụng phương thức find() để tìm vị trí ký tự @ và phép cắt xâu để lấy hai phần.",
      starterCode: "email = input()\n\n# Tìm vị trí ký tự @\n\n# In tên đăng nhập và tên miền trên hai dòng\n",
      points: 10,
      ioExamples: [
        {
          input: "hocsinh12@school.edu.vn",
          output: "hocsinh12\nschool.edu.vn",
        },
        {
          input: "python@gmail.com",
          output: "python\ngmail.com",
        }
      ],
      testCases: [
        {
          input: "hocsinh12@school.edu.vn",
          expected: "hocsinh12\nschool.edu.vn",
          description: "Email có tên miền nhiều cấp",
        },
        {
          input: "python@gmail.com",
          expected: "python\ngmail.com",
          description: "Email thông thường",
        },
        {
          input: "user_2026@outlook.com",
          expected: "user_2026\noutlook.com",
          description: "Tên đăng nhập chứa dấu gạch dưới và chữ số",
        },
        {
          input: "a@b.vn",
          expected: "a\nb.vn",
          description: "Tên đăng nhập ngắn",
        },
        {
          input: "lop12A1@thpt-example.edu.vn",
          expected: "lop12A1\nthpt-example.edu.vn",
          description: "Tên miền chứa dấu gạch ngang",
        }
      ],
    },
    {
      id: "bai-3",
      title: "Bài 3. Đếm số từ",
      description: "YÊU CẦU\nCho một dòng văn bản s. Mỗi từ là một nhóm ký tự liên tiếp không chứa khoảng trắng. Hãy đếm số từ có trong s.\n\nDỮ LIỆU VÀO\nMột dòng duy nhất chứa xâu s. Xâu có thể chứa nhiều khoảng trắng liên tiếp hoặc khoảng trắng ở đầu và cuối.\n\nDỮ LIỆU RA\nIn ra số lượng từ trong s.\n\nYÊU CẦU LẬP TRÌNH\nSử dụng phương thức split() không truyền đối số để tách các từ.",
      starterCode: "s = input()\n\n# Tách s thành danh sách từ rồi in số lượng từ\n",
      points: 10,
      ioExamples: [
        {
          input: "Hoc lap trinh Python",
          output: "4",
        },
        {
          input: "mot   hai    ba",
          output: "3",
        }
      ],
      testCases: [
        {
          input: "Hoc lap trinh Python",
          expected: "4",
          description: "Câu có bốn từ",
        },
        {
          input: "mot   hai    ba",
          expected: "3",
          description: "Có nhiều khoảng trắng liên tiếp",
        },
        {
          input: "Python",
          expected: "1",
          description: "Văn bản chỉ có một từ",
        },
        {
          input: "  dau va cuoi  ",
          expected: "3",
          description: "Có khoảng trắng ở đầu và cuối",
        },
        {
          input: "",
          expected: "0",
          description: "Dòng rỗng",
        }
      ],
    },
    {
      id: "bai-4",
      title: "Bài 4. Đảo thứ tự các từ",
      description: "YÊU CẦU\nCho một dòng văn bản s. Hãy đảo ngược thứ tự các từ trong s và chuẩn hóa khoảng cách để hai từ liên tiếp được phân cách bởi đúng một dấu cách.\n\nDỮ LIỆU VÀO\nMột dòng duy nhất chứa xâu s.\n\nDỮ LIỆU RA\nIn ra xâu nhận được sau khi đảo thứ tự các từ.\n\nYÊU CẦU LẬP TRÌNH\nSử dụng split(), list, vòng lặp for hoặc while và join(). Không sử dụng reversed().",
      starterCode: "s = input()\n\n",
      points: 10,
      ioExamples: [
        {
          input: "hoc lap trinh Python",
          output: "Python trinh lap hoc",
        },
        {
          input: "mot   hai ba",
          output: "ba hai mot",
        }
      ],
      testCases: [
        {
          input: "hoc lap trinh Python",
          expected: "Python trinh lap hoc",
          description: "Đảo một câu thông thường",
        },
        {
          input: "mot   hai ba",
          expected: "ba hai mot",
          description: "Chuẩn hóa khoảng trắng khi ghép",
        },
        {
          input: "Python",
          expected: "Python",
          description: "Danh sách chỉ có một từ",
        },
        {
          input: "1 2 3 4 5",
          expected: "5 4 3 2 1",
          description: "Đảo năm phần tử",
        }
      ],
    },
    {
      id: "bai-5",
      title: "Bài 5. Lọc các từ chứa từ khóa",
      description: "YÊU CẦU\nCho dòng xâu s và xâu keyword. Trước tiên, xác định vị trí xuất hiện đầu tiên của keyword trong s. Sau đó, loại bỏ mọi từ có chứa keyword và ghép các từ còn lại bằng đúng một dấu cách. Phép so sánh có phân biệt chữ hoa và chữ thường.\n\nDỮ LIỆU VÀO\n- Dòng 1 chứa xâu s.\n- Dòng 2 chứa xâu keyword.\n\nDỮ LIỆU RA\n- Dòng 1 in vị trí xuất hiện đầu tiên của keyword trong s, in -1 nếu không tìm thấy.\n- Dòng 2 in các từ còn lại sau khi lọc. Nếu không còn từ nào, in Rong.\n\nYÊU CẦU LẬP TRÌNH\nSử dụng toán tử in, các phương thức find(), split(), join(), list và vòng lặp for hoặc while.",
      starterCode: "s = input()\nkeyword = input()\n\n# Dòng 1: in vị trí đầu tiên của keyword trong s\n\n# Dòng 2: loại các từ chứa keyword rồi ghép phần còn lại\n",
      points: 10,
      ioExamples: [
        {
          input: "hoc python de hoc lap trinh\nhoc",
          output: "0\npython de lap trinh",
        },
        {
          input: "mot hai ba\nxyz",
          output: "-1\nmot hai ba",
        }
      ],
      testCases: [
        {
          input: "hoc python de hoc lap trinh\nhoc",
          expected: "0\npython de lap trinh",
          description: "Từ khóa xuất hiện trong nhiều từ",
        },
        {
          input: "tim vi tri va noi chuoi\ntri",
          expected: "7\ntim vi va noi chuoi",
          description: "Lọc một từ chứa từ khóa",
        },
        {
          input: "banana bandana apple\nana",
          expected: "1\napple",
          description: "Lọc nhiều từ chứa cùng chuỗi con",
        },
        {
          input: "mot hai ba\nxyz",
          expected: "-1\nmot hai ba",
          description: "Từ khóa không xuất hiện",
        },
        {
          input: "aa aa\naa",
          expected: "0\nRong",
          description: "Tất cả các từ đều bị loại",
        },
        {
          input: "Python python PYTHON\npython",
          expected: "7\nPython PYTHON",
          description: "Phân biệt chữ hoa và chữ thường",
        }
      ],
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
