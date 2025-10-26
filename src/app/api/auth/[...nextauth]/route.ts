import NextAuth from "next-auth";
import type { AuthOptions, Session, SessionStrategy } from "next-auth";
import Credentials from "next-auth/providers/credentials";

console.log('NextAuth config - NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET);

export const authOptions: AuthOptions = {
  session: {
    strategy: "jwt" as SessionStrategy,
    maxAge: 60 * 60 * 24,
  },
  jwt: {
    maxAge: 60 * 60 * 24 , 
  },
  providers: [
    Credentials({
      name: "Aptos Wallet",
      credentials: {
        address: { label: "address", type: "text" },
      },
      async authorize(credentials) {
        console.log('NextAuth authorize called with credentials:', credentials);
        if (!credentials) return null;
        const { address } = credentials as Record<string, string>;
        if (!address) return null;
        console.log('NextAuth authorize returning user:', { id: address, address });
        return { id: address, address } as { id: string; address: string };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      console.log('NextAuth JWT callback:', { token, user, trigger });
      if (user && (user as any).address) {
        const address = (user as any).address as string;
        token.address = address;
        console.log('NextAuth JWT: Setting token.address to:', address);
      }
      
      const now = Math.floor(Date.now() / 1000);
      const tokenAge = now - (Number(token.iat) || now);
      const oneDay = 24 * 60 * 60;
      
      if (tokenAge > oneDay) {
        token.iat = now;
      }
      
      console.log('NextAuth JWT: Returning token:', token);
      console.log('NextAuth JWT: Token will be stored in cookie');
      return token;
    },
    async session({ session, token }) {
      console.log('NextAuth session callback:', { session, token });
      const address = (token as any).address as string | undefined;
      if (address) {
        (session as Session & { address?: string }).address = address;
        console.log('NextAuth session: Setting session.address to:', address);
      }
      console.log('NextAuth session: Returning session:', session);
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

