import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "../../app/providers";
import { api, ApiError } from "../../lib/api";
import type { Appointment } from "../../lib/types";
import { AppointmentDrawer } from "./AppointmentDrawer";
import { appointmentKeys } from "./queries";

const appointment: Appointment = {
  id: 7,
  patient: 1,
  patient_name: "Ana Lopez",
  dentist: 2,
  dentist_name: "Sofia Ramirez",
  service: 3,
  service_name: "Cleaning",
  starts_at: "2030-06-10T16:00:00Z",
  ends_at: "2030-06-10T16:30:00Z",
  status: "pending",
  notes: "",
  created_at: "2030-06-01T00:00:00Z",
  updated_at: "2030-06-01T00:00:00Z",
};
const KEY = appointmentKeys.range("2030-06-10", "2030-06-16");

/** Renders the drawer from the cache, like SchedulePage does. */
function Harness({ client }: { client: ReturnType<typeof createQueryClient> }) {
  const list = client.getQueryData<Appointment[]>(KEY) ?? [];
  return (
    <AppointmentDrawer appointment={list.find((a) => a.id === 7) ?? null} onClose={() => {}} />
  );
}

function setup() {
  const client = createQueryClient();
  client.setQueryData(KEY, [appointment]);
  const view = render(
    <QueryClientProvider client={client}>
      <Harness client={client} />
    </QueryClientProvider>,
  );
  const rerender = () =>
    view.rerender(
      <QueryClientProvider client={client}>
        <Harness client={client} />
      </QueryClientProvider>,
    );
  return { client, rerender };
}

describe("AppointmentDrawer status changes", () => {
  afterEach(() => vi.restoreAllMocks());

  it("updates the cached status optimistically before the server answers", async () => {
    let resolve!: (value: Appointment) => void;
    vi.spyOn(api, "transition").mockReturnValue(new Promise((r) => (resolve = r)));
    const { client } = setup();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(client.getQueryData<Appointment[]>(KEY)?.[0]?.status).toBe("confirmed"),
    );
    resolve({ ...appointment, status: "confirmed" });
  });

  it("rolls back and shows the error when the API rejects the change", async () => {
    vi.spyOn(api, "transition").mockRejectedValue(
      new ApiError(409, { detail: "Cannot change a cancelled appointment to confirmed." }),
    );
    vi.spyOn(api, "allAppointments").mockResolvedValue([appointment]);
    const { client, rerender } = setup();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Cannot change a cancelled"),
    );
    rerender();
    expect(client.getQueryData<Appointment[]>(KEY)?.[0]?.status).toBe("pending");
  });

  it("only offers actions that are valid for the current status", () => {
    setup();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark completed" })).not.toBeInTheDocument();
  });
});
