import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { z } from "zod";

import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { ToothMark } from "../../components/ui/Logo";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { ApiError } from "../../lib/api";
import { isStaff } from "../../lib/types";
import { useAuth } from "./auth-context";

const schema = z.object({
  username: z.string().trim().min(1, "Enter your email or username"),
  password: z.string().min(1, "Enter your password"),
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
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });

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
    <section className="grid min-h-[calc(100dvh-4.5rem)] place-items-center bg-mint-50 px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-brand-900/5 ring-1 ring-ink-100"
      >
        <ToothMark className="size-11" />
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-ink-900">Welcome back</h1>
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
      </motion.div>
    </section>
  );
}
