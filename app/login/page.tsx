import { sendMagicLink } from "./actions";

const ERRORS: Record<string, string> = {
  email: "이메일 주소를 확인해 주세요.",
  forbidden: "이 지도는 등록된 이메일로만 들어올 수 있어요.",
  link: "링크가 만료되었거나 잘못되었어요. 다시 요청해 주세요.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-[420px] rounded-[20px] border border-line bg-card p-8 md:p-10">
        <div className="serif text-[28px] font-bold tracking-[-0.5px]">나의 일본 여행 지도</div>
        <p className="mt-2 text-sm text-muted">이메일로 로그인 링크를 보내드려요. 비밀번호는 없어요.</p>

        {sent ? (
          <div className="mt-8 rounded-xl border border-dashed border-plan bg-plan-bg px-4 py-4 text-sm text-[#3F4A55]">
            메일함을 확인해 주세요. 링크를 누르면 바로 지도로 들어갑니다.
          </div>
        ) : (
          <form action={sendMagicLink} className="mt-8 flex flex-col gap-3">
            <label htmlFor="email" className="text-xs font-medium text-muted">
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="rounded-[10px] border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-ink"
            />
            <button type="submit" className="mt-1 rounded-[10px] bg-v3 px-4 py-3 text-sm font-semibold text-card hover:brightness-95">
              로그인 링크 보내기
            </button>
            {error ? (
              <p className="text-xs text-v3" role="alert">
                {ERRORS[error] ?? error}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </main>
  );
}
