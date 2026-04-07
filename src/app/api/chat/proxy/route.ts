import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;

    // Get IP address for Guest users
    let ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    if (!ip) {
      ip = "unknown-ip";
    } else {
      // Handle the case where the header might contain multiple IPs
      ip = ip.split(',')[0].trim();
    }

    const identifier = userId || ip;
    const isMember = !!userId;
    const limit = isMember ? 50 : 35;
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { prisma } = await import("@/lib/prisma");

    // Upsert the usage count for today
    const rateLimit = await prisma.rateLimit.upsert({
      where: {
        identifier_date: {
          identifier,
          date: today,
        },
      },
      update: {
        count: {
          increment: 1,
        },
      },
      create: {
        identifier,
        date: today,
        count: 1,
      },
    });

    // If limits exceeded *before* the increment, deny.
    // Notice that upsert incremented it, so if rateLimit.count > limit, it means they just surpassed it or are already above.
    if (rateLimit.count > limit) {
      return NextResponse.json(
        { 
          error: "RATE_LIMIT_EXCEEDED", 
          message: `Batas limit harian telah tercapai. Anda memiliki batas ${limit} pesan/hari.` 
        }, 
        { status: 429 }
      );
    }

    // Pass the payload transparently to Python Backend
    const body = await req.json();
    const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

    const fetchRes = await fetch(`${BACKEND_URL}/api/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!fetchRes.ok) {
      // Something failed at the Python Backend level
      const errorText = await fetchRes.text();
      return NextResponse.json(
        { message: "Backend error", details: errorText }, 
        { status: fetchRes.status }
      );
    }

    const data = await fetchRes.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("[RateLimit Proxy Error]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
