import type { DemoAccount } from "../../lib/types";

/**
 * "Try the demo" card on the login page (public demo mode, docs/DEPLOY.md §5). The accounts
 * come from GET /api/demo/ (only available when the server runs in demo mode); choosing
 * one fills the sign-in form.
 */
export function DemoAccounts({
  accounts,
  onPick,
}: {
  accounts: DemoAccount[];
  onPick: (account: DemoAccount) => void;
}) {
  return (
    <section
      aria-labelledby="demo-title"
      className="mt-8 rounded-2xl bg-mint-50 p-5 ring-1 ring-brand-100"
    >
      <h2 id="demo-title" className="font-display text-xl text-ink-900">
        Try the demo
      </h2>
      <p className="mt-1 text-sm text-ink-600">
        Public demo accounts. Everything resets every night.
      </p>
      <ul className="mt-4 space-y-3">
        {accounts.map((account) => (
          <li key={account.role} className="rounded-xl bg-white p-3 ring-1 ring-ink-100">
            <p className="text-sm font-semibold text-ink-900">{account.label}</p>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 text-sm text-ink-600">
              <dt>User</dt>
              <dd className="font-mono break-all text-ink-800">{account.username}</dd>
              <dt>Password</dt>
              <dd className="font-mono break-all text-ink-800">{account.password}</dd>
            </dl>
            <button
              type="button"
              onClick={() => onPick(account)}
              className="mt-2 text-sm font-semibold text-brand-700 hover:underline"
            >
              Use this account
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
