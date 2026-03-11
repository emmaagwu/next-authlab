import "./globals.css";
import { auth } from "@/auth";
import NavBar from "@/components/NavBar";

export const metadata = {
  title: "AuthLab — Next.js Authentication Mastery",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // auth() here gives us the session for the NavBar (RSC — no client state needed)
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <NavBar session={session} />
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  );
}