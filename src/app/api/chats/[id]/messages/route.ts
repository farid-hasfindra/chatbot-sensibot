import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");
    
    const chat = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!chat || chat.userId !== userId) {
      return NextResponse.json({ message: "Chat not found" }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[GET messages]", msg);
    return NextResponse.json({ message: "Internal server error", detail: msg }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");
    const body = await req.json();
    const { role, content } = body;
    const tokens: number | null = body.tokens ?? null;
    const model: string | null = body.model ?? null;
    const isRag: boolean = body.isRag ?? false;

    const message = await prisma.message.create({
      data: { conversationId, role, content, tokens, model, isRag }
    });
    
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json(message);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[POST message]", msg);
    return NextResponse.json({ message: "Internal server error", detail: msg }, { status: 500 });
  }
}
