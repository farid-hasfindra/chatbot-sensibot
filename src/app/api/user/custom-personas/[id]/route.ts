import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, prompt } = await req.json();
    if (!name || !prompt) {
      return NextResponse.json({ message: "Name and prompt are required" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");

    // Ensure they own it
    const existing = await prisma.customPersona.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ message: "Not found or unauthorized" }, { status: 404 });
    }
    
    const updatedPersona = await prisma.customPersona.update({
      where: { id: params.id },
      data: { name, prompt }
    });

    return NextResponse.json({ message: "Updated successfully", customPersona: updatedPersona });
  } catch (error) {
    console.error("[PUT custom-personas id]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;
    
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@/lib/prisma");

    const existing = await prisma.customPersona.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ message: "Not found or unauthorized" }, { status: 404 });
    }
    
    await prisma.customPersona.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("[DELETE custom-personas id]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
