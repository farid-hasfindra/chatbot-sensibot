import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { systemPrompt: true }
    });

    return NextResponse.json({ systemPrompt: user?.systemPrompt || null });
  } catch (error) {
    console.error("[GET persona]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { systemPrompt } = await req.json();
    const { prisma } = await import("@/lib/prisma");
    
    await prisma.user.update({
      where: { id: userId },
      data: { systemPrompt }
    });

    return NextResponse.json({ message: "Updated successfully" });
  } catch (error) {
    console.error("[PUT persona]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
