import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WaitlistForm } from "./WaitlistForm";

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Your name"), "Mari Tamm");
  await user.type(screen.getByLabelText("Work email"), "mari@example.org");
  await user.type(screen.getByLabelText("Organisation"), "Harbour Food Bank");
  await user.click(screen.getByLabelText("Charity"));
  await user.selectOptions(screen.getByLabelText("Number of volunteers"), "26-100");
  await user.click(screen.getByRole("checkbox"));
}

afterEach(() => vi.restoreAllMocks());

describe("WaitlistForm", () => {
  it("shows field errors and does not call the API when empty", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    render(<WaitlistForm />);

    await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

    expect(screen.getByText("Please enter a name")).toBeInTheDocument();
    expect(screen.getByText("Please enter a valid email")).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveAttribute("aria-invalid", "true");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("submits valid data and shows the success message", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ message: "You're on the list." }), { status: 201 }));
    const user = userEvent.setup();
    render(<WaitlistForm />);

    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("You're on the list."));
    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body).toMatchObject({ email: "mari@example.org", orgType: "charity", consent: true });
  });

  it("shows server errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Too many attempts. Please try again later." }), { status: 429 }),
    );
    const user = userEvent.setup();
    render(<WaitlistForm />);

    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/too many attempts/i);
  });

  it("handles a network failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    render(<WaitlistForm />);

    await fillValid(user);
    await user.click(screen.getByRole("button", { name: /join the waitlist/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/can't reach the server/i);
  });
});
