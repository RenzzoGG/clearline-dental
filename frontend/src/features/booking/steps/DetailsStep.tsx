import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { z } from "zod";

import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Field } from "../../../components/ui/Field";
import { Icon } from "../../../components/ui/Icon";
import { ApiError } from "../../../lib/api";
import { isStaff, type Me } from "../../../lib/types";
import { useAuth } from "../../auth/auth-context";

const registerSchema = z.object({
  first_name: z.string().trim().min(1, "Required"),
  last_name: z.string().trim().min(1, "Required"),
  email: z.email("Enter a valid email"),
  phone: z.string().trim().min(7, "Enter a phone number we can reach you at"),
  // The server runs Django's password validators; this is only quick feedback.
  password: z.string().min(8, "Use at least 8 characters"),
});
type RegisterForm = z.infer<typeof registerSchema>;

const loginSchema = z.object({
  username: z.email("Enter the email you registered with"),
  password: z.string().min(1, "Enter your password"),
});
type LoginForm = z.infer<typeof loginSchema>;

/** Copies DRF field errors onto the form; returns a general message for the rest. */
function applyServerErrors<T extends FieldValues>(
  error: unknown,
  fields: Path<T>[],
  setError: UseFormSetError<T>,
): string | null {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";
  let handled = false;
  for (const field of fields) {
    const message = error.fieldError(field);
    if (message) {
      setError(field, { message });
      handled = true;
    }
  }
  return handled ? null : (error.fieldError() ?? error.message);
}

/** onReady receives the signed-in user right away (context state updates on the next render). */
export function DetailsStep({ onReady }: { onReady: (me: Me) => void }) {
  const { user, logout } = useAuth();
  const [mode, setMode] = useState<"register" | "login">("register");

  if (user && isStaff(user)) {
    return (
      <Alert tone="info">
        You&apos;re signed in as clinic staff. Book for patients from the{" "}
        <a href="/dashboard" className="font-semibold underline">
          dashboard
        </a>
        , or{" "}
        <button type="button" className="font-semibold underline" onClick={() => void logout()}>
          sign out
        </button>{" "}
        to book as a patient.
      </Alert>
    );
  }

  if (user) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-100">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-white text-brand-700">
            <Icon name="user" />
          </span>
          <div>
            <p className="font-bold text-ink-900">
              Booking as {user.first_name} {user.last_name}
            </p>
            <p className="text-sm text-ink-600">{user.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void logout()}>
          Not you?
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div role="tablist" aria-label="Account" className="inline-flex rounded-full bg-ink-100 p-1">
        {(["register", "login"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={mode === tab}
            onClick={() => setMode(tab)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              mode === tab ? "bg-white text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900"
            }`}
          >
            {tab === "register" ? "I'm new here" : "I have an account"}
          </button>
        ))}
      </div>
      <div className="mt-6" role="tabpanel">
        {mode === "register" ? (
          <RegisterPanel onReady={onReady} />
        ) : (
          <LoginPanel onReady={onReady} />
        )}
      </div>
    </div>
  );
}

function RegisterPanel({ onReady }: { onReady: (me: Me) => void }) {
  const { register: signUp } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (data) => {
    setServerError(null);
    try {
      onReady(await signUp(data));
    } catch (error) {
      setServerError(
        applyServerErrors(
          error,
          ["first_name", "last_name", "email", "phone", "password"],
          setError,
        ),
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      {serverError && (
        <div className="sm:col-span-2">
          <Alert>{serverError}</Alert>
        </div>
      )}
      <Field
        label="First name"
        autoComplete="given-name"
        error={errors.first_name?.message}
        {...register("first_name")}
      />
      <Field
        label="Last name"
        autoComplete="family-name"
        error={errors.last_name?.message}
        {...register("last_name")}
      />
      <Field
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <Field
        label="Phone"
        type="tel"
        autoComplete="tel"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        className="sm:col-span-2"
        hint="At least 8 characters; avoid common passwords."
        error={errors.password?.message}
        {...register("password")}
      />
      <div className="sm:col-span-2">
        <Button type="submit" loading={isSubmitting}>
          Create account and continue
        </Button>
      </div>
    </form>
  );
}

function LoginPanel({ onReady }: { onReady: (me: Me) => void }) {
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setServerError(null);
    try {
      const me = await login(username, password);
      if (isStaff(me)) return; // the staff notice above takes over
      onReady(me);
    } catch (error) {
      setServerError(
        error instanceof ApiError && error.status === 401
          ? "That email and password don't match."
          : "We couldn't sign you in. Please try again.",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-md gap-4">
      {serverError && <Alert>{serverError}</Alert>}
      <Field
        label="Email"
        type="email"
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
      <div>
        <Button type="submit" loading={isSubmitting}>
          Sign in and continue
        </Button>
      </div>
    </form>
  );
}
