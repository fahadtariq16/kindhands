import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmButton, SpotsBar } from "./ui";
import { fromLocalInput, groupByDay, hours } from "../lib/format";

describe("ConfirmButton", () => {
  it("asks before doing anything destructive", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmButton onConfirm={onConfirm} confirmLabel="Yes, delete">Delete</ConfirmButton>);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("SpotsBar", () => {
  it("describes how full a shift is for screen readers", () => {
    render(<SpotsBar filled={3} spots={5} />);
    expect(screen.getByRole("img", { name: "3 of 5 spots filled" })).toBeInTheDocument();
  });
});

describe("date helpers", () => {
  it("computes shift length and groups shifts by day", () => {
    expect(hours("2026-03-04T10:00:00Z", "2026-03-04T13:30:00Z")).toBe(3.5);
    const groups = groupByDay([
      { startsAt: "2026-03-04T10:00:00Z" },
      { startsAt: "2026-03-04T15:00:00Z" },
      { startsAt: "2026-03-06T10:00:00Z" },
    ]);
    expect(groups.map((g) => g.items.length)).toEqual([2, 1]);
    expect(fromLocalInput("")).toBe("");
  });
});
