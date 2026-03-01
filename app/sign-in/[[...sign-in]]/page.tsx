import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div
      className="tg-root flex items-center justify-center min-h-dvh"
      style={{ padding: 24 }}
    >
      <SignIn />
    </div>
  );
}
