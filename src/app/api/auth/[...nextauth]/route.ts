import NextAuth, { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
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
        message: { label: "message", type: "text", optional: true as any },
        signature: { label: "signature", type: "text", optional: true as any },
        nonce: { label: "nonce", type: "text", optional: true as any },
      },
      async authorize(credentials, req) {
        if (!credentials) return null;
        const { address } = credentials as Record<string, string>;
        if (!address) return null;
        // Trust wallet connect flow: connect = login (no signature)
        return { id: address, address } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.address = (user as any).address;
        token.sub = (user as any).address;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).address = token.address;
      return session;
    },
  },
  pages: {},
  secret: process.env.NEXTAUTH_SECRET,
};

const authHandler = NextAuth(authOptions);

export async function GET(request: Request, context: { params: { nextauth: string[] } }) {
  return (authHandler as any)(request, context);
}

export const POST = authHandler;


