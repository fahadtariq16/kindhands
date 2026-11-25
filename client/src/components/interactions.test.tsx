import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FaqItem } from "./FaqItem";
import { ShiftBoardMock } from "./ShiftBoardMock";

describe("FaqItem", () => {
  it("toggles the answer and aria-expanded", async () => {
    const user = userEvent.setup();
    render(<FaqItem question="Is it free?" answer="During beta, yes." />);
    const button = screen.getByRole("button", { name: "Is it free?" });

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("During beta, yes.")).not.toBeInTheDocument();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("During beta, yes.")).toBeVisible();
  });
});

describe("ShiftBoardMock", () => {
  it("fills a spot when a shift is taken", async () => {
    const user = userEvent.setup();
    render(<ShiftBoardMock />);

    expect(screen.getByText("3 spots open")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /take shift.*delivery driver/i }));

    expect(screen.getByText("2 spots open")).toBeInTheDocument();
    expect(screen.getByText("You're in")).toBeInTheDocument();
  });

  it("does not offer a full shift", () => {
    render(<ShiftBoardMock />);
    expect(screen.queryByRole("button", { name: /take shift.*welcome desk/i })).not.toBeInTheDocument();
    expect(screen.getByText("Full")).toBeInTheDocument();
  });
});
