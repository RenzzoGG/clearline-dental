import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DemoAccount } from "../../lib/types";
import { DemoAccounts } from "./DemoAccounts";

const accounts: DemoAccount[] = [
  { role: "receptionist", label: "Front desk", username: "demo-reception", password: "pw-one" },
  {
    role: "patient",
    label: "Patient",
    username: "demo.patient@clearline.test",
    password: "pw-two",
  },
];

describe("DemoAccounts", () => {
  it("shows each demo account with its credentials", () => {
    render(<DemoAccounts accounts={accounts} onPick={() => {}} />);
    expect(screen.getByRole("heading", { name: "Try the demo" })).toBeInTheDocument();
    expect(screen.getByText("demo-reception")).toBeInTheDocument();
    expect(screen.getByText("pw-two")).toBeInTheDocument();
  });

  it("hands the chosen account to the form", async () => {
    const onPick = vi.fn();
    render(<DemoAccounts accounts={accounts} onPick={onPick} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Use this account" })[1]!);
    expect(onPick).toHaveBeenCalledWith(accounts[1]);
  });
});
