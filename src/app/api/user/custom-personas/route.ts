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
    const customPersonas = await prisma.customPersona.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json({ customPersonas });
  } catch (error) {
    console.error("[GET custom-personas]", error);
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

    const { name, prompt } = await req.json();
    if (!name || !prompt) {
      return NextResponse.json({ message: "Name and prompt are required" }, { status: 400 });
    }

    const { prisma } = await import("@/lib/prisma");
    
    const newPersona = await prisma.customPersona.create({
      data: {
        userId,
        name,
        prompt
      }
    });

    return NextResponse.json({ message: "Created successfully", customPersona: newPersona });
  } catch (error) {
    console.error("[POST custom-personas]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
