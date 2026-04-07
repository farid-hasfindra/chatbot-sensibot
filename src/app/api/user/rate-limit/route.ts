import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;

    let ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    if (!ip) {
      ip = "unknown-ip";
    } else {
      ip = ip.split(',')[0].trim();
    }

    const identifier = userId || ip;
    const isMember = !!userId;
    const limit = isMember ? 50 : 35;
    const today = new Date().toISOString().split("T")[0];

    const { prisma } = await import("@/lib/prisma");

    const rateLimit = await prisma.rateLimit.findUnique({
      where: {
        identifier_date: {
          identifier,
          date: today,
        },
      },
    });

    const count = rateLimit ? rateLimit.count : 0;
    
    return NextResponse.json({ count, limit });
  } catch (error) {
    console.error("[GET rate-limit]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
