import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth-token")?.value;

  if (!authToken) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const user = JSON.parse(authToken);
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv";

  if (format === "csv") {
    const content = `username,password,fullName,email,role
hocsinh1,Pass123,Nguyen Van A,a@email.com,student
hocsinh2,Pass456,Tran Thi B,b@email.com,student
hocsinh3,Pass789,Le Van C,c@email.com,student`;

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=template-users.csv",
      },
    });
  } else {
    const content = `# Format: username password [fullName] [email] [role]
# Lines starting with # are comments
# Default role is 'student' if not specified

hocsinh1 Pass123 NguyenVanA a@email.com student
hocsinh2 Pass456 TranThiB b@email.com student
hocsinh3 Pass789 LeVanC c@email.com student`;

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": "attachment; filename=template-users.txt",
      },
    });
  }
}
