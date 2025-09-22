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
        message: { label: "message", type: "text" },
        signature: { label: "signature", type: "text" },
        nonce: { label: "nonce", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials) return null;
        const { address, message, signature, nonce } = credentials as Record<string, string>;

        if (!address || !message || !signature || !nonce) return null;
        const cookieHeader = (req as any)?.headers?.get?.('cookie') || (req as any)?.headers?.cookie || '';
        const storedNonce = cookieHeader
          .split(';')
          .map((c: string) => c.trim())
          .find((c: string) => c.startsWith('auth_nonce='))?.split('=')[1];
        if (!storedNonce || storedNonce !== nonce) {
          return null;
        }
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
  try {
    const url = new URL(request.url);
    const wantNonce = url.searchParams.get("nonce");
    if (wantNonce) {
      const nonce = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const res = new Response(JSON.stringify({ nonce }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
      const cookie = `auth_nonce=${nonce}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300; Secure`;
      res.headers.append("set-cookie", cookie);
      return res;
    }
  } catch {}
  return (authHandler as any)(request, context);
}

export const POST = authHandler;


