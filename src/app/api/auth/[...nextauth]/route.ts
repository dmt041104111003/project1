import NextAuth from "next-auth";
import type { AuthOptions, SessionStrategy } from "next-auth";
import Credentials from "next-auth/providers/credentials";

const options: AuthOptions = {
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
    async jwt(params) {
      return params.token;
    },
    async session(params) {
      return params.session;
    },
  },
  pages: {},
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(options);
export { handler as GET, handler as POST };


