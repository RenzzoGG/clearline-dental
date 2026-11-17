import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookingChecklist } from "./BookingChecklist";

describe("BookingChecklist", () => {
  it("announces completed steps and shows the chosen values", () => {
    render(
      <BookingChecklist
        items={[
          { step: "service", done: true, detail: "Root canal" },
          { step: "dentist", done: false },
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Service (completed)");
    expect(items[0]).toHaveTextContent("Root canal");
    expect(items[1]).toHaveTextContent("Dentist");
    expect(items[1]).not.toHaveTextContent("completed");
  });
});
