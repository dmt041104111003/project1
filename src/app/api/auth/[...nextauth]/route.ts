import NextAuth from "next-auth";
import type { AuthOptions, Session, SessionStrategy } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt" as SessionStrategy,
    maxAge: 60 * 60 * 24,
  },
  jwt: {
    maxAge: 60 * 60 * 24,
  },
  providers: [
    Credentials({
      name: "Aptos Wallet",
      credentials: {
        address: { label: "address", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const { address } = credentials as Record<string, string>;
        if (!address) return null;
        return { id: address, address } as { id: string; address: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && (user as any).address) {
        const address = (user as any).address as string;
        token.address = address;
      }
      return token;
    },
    async session({ session, token }) {
      const address = (token as any).address as string | undefined;
      if (address) {
        (session as Session & { address?: string }).address = address;
      }
      return session;
    },
  },
  pages: {},
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };


