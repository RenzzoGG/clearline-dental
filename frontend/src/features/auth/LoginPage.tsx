import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { z } from "zod/mini";

import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { ToothMark } from "../../components/ui/Logo";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { api, ApiError } from "../../lib/api";
import { isStaff, type DemoAccount } from "../../lib/types";
import { useAuth } from "./auth-context";
import { DemoAccounts } from "./DemoAccounts";

// zod/mini: same validation as classic Zod, but as tree-shakable functions (.check(...))
// instead of methods, which keeps the form chunk on /book and /login much smaller.
const schema = z.object({
  username: z.string().check(z.trim(), z.minLength(1, "Enter your email or username")),
  password: z.string().check(z.minLength(1, "Enter your password")),
});
type LoginForm = z.infer<typeof schema>;

/** Only allow in-app redirects (avoid open redirects via ?next=https://evil.example). */
const safeNext = (next: string | null) =>
  next && next.startsWith("/") && !next.startsWith("//") ? next : null;

export default function LoginPage() {
  useDocumentTitle("Sign in");
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });
  // Demo mode only: the server answers 404 otherwise and the card stays hidden.
  const demo = useQuery({
    queryKey: ["demo-accounts"],
    queryFn: api.demoAccounts,
    retry: false,
    staleTime: Infinity,
  });
  const pickDemo = (account: DemoAccount) => {
    setValue("username", account.username, { shouldValidate: true });
    setValue("password", account.password, { shouldValidate: true });
  };

  if (user) return <Navigate to={next ?? (isStaff(user) ? "/dashboard" : "/")} replace />;

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setServerError(null);
    try {
      const me = await login(username, password);
      navigate(next ?? (isStaff(me) ? "/dashboard" : "/"), { replace: true });
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status === 401
          ? "That email/username and password don't match."
          : "We couldn't sign you in. Please try again.",
      );
    }
  });

  return (
    // Top-aligned rather than centered: the demo card arrives after its request, and
    // appending it at the end must not move what is already on screen (layout shift).
    <section className="grid min-h-[calc(100dvh-4.5rem)] content-start justify-items-center bg-mint-50 px-4 py-16">
      {/* CSS entrance that only slides (no fade): the card holds the LCP heading, and
          opacity 0 would delay LCP. No Motion on this route keeps its JS small. */}
      <div
        style={
          { "--fade-from": "16px", "--fade-opacity": 1, animationDuration: "0.4s" } as CSSProperties
        }
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-brand-900/5 ring-1 ring-ink-100 motion-on:animate-fade-up"
      >
        <ToothMark className="size-11" />
        <h1 className="mt-6 font-display text-4xl text-ink-900">Welcome back</h1>
        <p className="mt-1 text-ink-500">
          Patients sign in with their email. Staff use their username.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
          {serverError && <Alert>{serverError}</Alert>}
          <Field
            label="Email or username"
            autoComplete="username"
            error={errors.username?.message}
            {...register("username")}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          New patient?{" "}
          <Link to="/book" className="font-semibold text-brand-700 hover:underline">
            Book a visit and create your account
          </Link>
        </p>

        {demo.data && demo.data.accounts.length > 0 && (
          <DemoAccounts accounts={demo.data.accounts} onPick={pickDemo} />
        )}
      </div>
    </section>
  );
}
