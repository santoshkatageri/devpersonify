import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { FeedbackControl } from "./feedback-control";
import { tallyFeedbackFormId } from "./tally-feedback";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

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

  it("loads Tally on opening feedback, excludes private route data, and avoids duplicate bug links", async () => {
    vi.stubEnv("VITE_TALLY_FEEDBACK_FORM_ID", "abc123");
    const user = userEvent.setup();
    const { container } = render(<MemoryRouter initialEntries={["/career/private-user/resume?secret=private"]}><FeedbackControl /></MemoryRouter>);
    expect(container.querySelector("iframe")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Feedback" }));
    expect(screen.queryByRole("button", { name: "Save feedback draft" })).not.toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Open in new tab/ });
    const url = new URL(link.getAttribute("href")!);
    expect(url.origin).toBe("https://tally.so");
    expect(url.pathname).toBe("/r/abc123");
    expect(Object.fromEntries(url.searchParams)).toEqual({ product: "DevPersonify", area: "resume_builder", source: "app" });
    expect(link).toHaveAttribute("rel", "noreferrer");
    const frame = await screen.findByTitle("DevPersonify feedback form");
    expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(frame.getAttribute("src")).not.toMatch(/private-user|secret|private/);
    expect(frame.getAttribute("src")).toContain("https://tally.so/embed/abc123?");
    expect(screen.queryByRole("link", { name: /Found a bug/ })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    await user.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByRole("button", { name: "Restore size" })).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("devpersonify:feedback:v1")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Close feedback" }));
    expect(container.querySelector("iframe")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
