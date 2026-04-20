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
    const chats = await prisma.conversation.findMany({
      where: { userId, parentId: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true }
    });

    return NextResponse.json(chats);
  } catch (error) {
    console.error("[GET chats]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { title, parentId } = await req.json();
    const { prisma } = await import("@/lib/prisma");
    
    const chat = await prisma.conversation.create({
      data: {
        title: title || "Obrolan Baru",
        userId,
        ...(parentId && { parentId })
      }
    });

    return NextResponse.json(chat);
  } catch (error) {
    console.error("[POST chat]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
