"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setError("请输入管理员密码");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message ?? "登录失败，请稍后重试");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("无法连接登录服务");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-2">
        <label htmlFor="password" className="text-xs font-medium">
          管理员密码
        </label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            id="password"
            name="password"
            type={isPasswordVisible ? "text" : "password"}
            placeholder="输入管理员密码"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError("");
            }}
            autoComplete="current-password"
            required
            autoFocus
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "password-error" : "password-hint"}
            className="flex h-9 w-full rounded-md border bg-transparent pl-8 pr-10 text-xs outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-foreground/20 focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => setIsPasswordVisible((current) => !current)}
            className="absolute right-0 top-0 grid size-9 place-items-center rounded-r-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
            aria-label={isPasswordVisible ? "隐藏密码" : "显示密码"}
            aria-pressed={isPasswordVisible}
          >
            {isPasswordVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>
        {error ? (
          <p id="password-error" className="text-[11px] text-destructive" role="alert">{error}</p>
        ) : (
          <p id="password-hint" className="text-[11px] text-muted-foreground">仅限项目管理员访问</p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting || !password}
        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-foreground text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40"
      >
        {isSubmitting ? <LoaderCircle className="size-3 animate-spin" /> : null}
        {isSubmitting ? "正在验证" : "登录"}
      </button>
    </form>
  );
}
