import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");

    // Fetch children conversations
    const childChats = await prisma.conversation.findMany({
      where: {
        userId,
        parentId: id,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true }
    });

    return NextResponse.json(childChats);
  } catch (error) {
    console.error("[GET child chats]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
