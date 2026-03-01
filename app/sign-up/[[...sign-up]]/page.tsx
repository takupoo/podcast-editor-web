import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div
      className="tg-root flex items-center justify-center min-h-dvh"
      style={{ padding: 24 }}
    >
      <SignUp />
    </div>
  );
}
