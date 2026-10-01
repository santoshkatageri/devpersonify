import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { FeedbackControl } from "./feedback-control";
import { tallyFeedbackFormId } from "./tally-feedback";

afterEach(() => vi.unstubAllEnvs());

describe("Tally feedback integration", () => {
  it("defaults to the published DevPersonify form", () => {
    vi.stubEnv("VITE_TALLY_FEEDBACK_FORM_ID", undefined);
    expect(tallyFeedbackFormId()).toBe("PdVrRd");
  });

  it("explicitly disabling Tally preserves honest local-only drafts", async () => {
    vi.stubEnv("VITE_TALLY_FEEDBACK_FORM_ID", "");
    const user = userEvent.setup();
    render(<MemoryRouter><FeedbackControl /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "Feedback" }));
    await user.click(screen.getByRole("button", { name: "Useful" }));
    await user.type(screen.getByLabelText(/What worked well/), "A useful audit");
    await user.click(screen.getByRole("button", { name: "Save feedback draft" }));
    expect(screen.getByText(/Draft saved in this browser only/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load feedback form" })).not.toBeInTheDocument();
    expect(localStorage.getItem("devpersonify:feedback:v1")).toContain("A useful audit");
  });

  it.each(["", "https://tally.so/r/abc123", "abc/def", "abc?token=secret"])("keeps invalid config %s in local mode", (value) => {
    vi.stubEnv("VITE_TALLY_FEEDBACK_FORM_ID", value);
    expect(tallyFeedbackFormId()).toBeNull();
  });

  it("loads Tally only on request, excludes private route data, and preserves the bug link", async () => {
    vi.stubEnv("VITE_TALLY_FEEDBACK_FORM_ID", "abc123");
    const user = userEvent.setup();
    const { container } = render(<MemoryRouter initialEntries={["/career/private-user/resume?secret=private"]}><FeedbackControl /></MemoryRouter>);
    expect(container.querySelector("iframe")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Feedback" }));
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save feedback draft" })).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Open feedback form in a new tab/ });
    const url = new URL(link.getAttribute("href")!);
    expect(url.origin).toBe("https://tally.so");
    expect(url.pathname).toBe("/r/abc123");
    expect(Object.fromEntries(url.searchParams)).toEqual({ product: "DevPersonify", area: "resume_builder", source: "app" });
    expect(link).toHaveAttribute("rel", "noreferrer");
    await user.click(screen.getByRole("button", { name: "Load feedback form" }));
    const frame = screen.getByTitle("DevPersonify feedback form");
    expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(frame.getAttribute("src")).not.toMatch(/private-user|secret|private/);
    expect(frame.getAttribute("src")).toContain("https://tally.so/embed/abc123?");
    expect(screen.getByRole("link", { name: /Found a bug/ })).toHaveAttribute("href", "https://github.com/santoshkatageri/devpersonify/issues/new");
    expect(localStorage.getItem("devpersonify:feedback:v1")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Close feedback" }));
    expect(container.querySelector("iframe")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Feedback" }));
    expect(container.querySelector("iframe")).toBeNull();
  });
});
