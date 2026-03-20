import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { title } = await req.json();
    const { prisma } = await import("@/lib/prisma");

    const chat = await prisma.conversation.findUnique({ where: { id } });
    if (!chat || chat.userId !== userId) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: { title, updatedAt: chat.updatedAt }, // preserve original timestamp so order doesn't change
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { prisma } = await import("@/lib/prisma");

    const chat = await prisma.conversation.findUnique({ where: { id } });
    if (!chat || chat.userId !== userId) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    await prisma.conversation.delete({ where: { id } });

    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
