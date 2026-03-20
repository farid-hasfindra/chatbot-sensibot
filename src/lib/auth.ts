import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        try {
          // Lazy import to avoid crashing if prisma client isn't generated yet
          const { prisma } = await import("./prisma");
          const bcrypt = await import("bcryptjs");
          
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });
          
          if (!user || !user.password) return null;
          
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) return null;
          
          return {
            id: user.id,
            name: user.name,
            email: user.email,
          };
        } catch (e) {
          console.error("[NextAuth] authorize error:", e);
          return null;
        }
      }
    })
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub,
        },
      };
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    }
  },
  pages: {
    signIn: '/login',
  }
};
