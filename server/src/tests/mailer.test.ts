import { describe, it, expect, vi } from "vitest";
import { ResendMailer } from "../src/mail/mailer.js";
import { configProblems, config } from "../src/config.js";

describe("ResendMailer", () => {
  it("posts the email to the Resend API with the key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    const mailer = new ResendMailer("re_test", "Kindhands <a@b.example>", fetchMock as unknown as typeof fetch);
    await mailer.send({ to: "x@y.example", subject: "Hi", html: "<p>Hi</p>", text: "Hi" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body)).toMatchObject({ to: ["x@y.example"], subject: "Hi", from: "Kindhands <a@b.example>" });
  });

  it("throws on API errors so they get logged", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("invalid from", { status: 422 }));
    const mailer = new ResendMailer("re_test", "x", fetchMock as unknown as typeof fetch);
    await expect(mailer.send({ to: "a@b.c", subject: "s", html: "h", text: "t" })).rejects.toThrow(/422/);
  });
});

describe("production config check", () => {
  const prod = { ...config, isProd: true, databaseUrl: "postgresql://x", appUrl: "https://k.netlify.app" };
  it("accepts a Resend API key instead of SMTP", () => {
    process.env.MAIL_FROM = "a@b.c";
    process.env.APP_URL = "https://k.netlify.app";
    expect(configProblems({ ...prod, resendApiKey: "re_x", smtp: { ...config.smtp, host: "" } })).toEqual([]);
  });
  it("asks for an email setting when neither is set", () => {
    const problems = configProblems({ ...prod, resendApiKey: "", smtp: { ...config.smtp, host: "" } });
    expect(problems.join(" ")).toMatch(/RESEND_API_KEY/);
  });
});
