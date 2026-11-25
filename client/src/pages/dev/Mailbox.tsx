import { useState } from "react";
import { Link } from "react-router";
import { Inbox, RefreshCw, Trash2 } from "lucide-react";
import { Empty, ErrorBox, Spinner } from "../../components/ui";
import { api } from "../../api/client";
import { useApi } from "../../lib/useApi";
import { timeAgo } from "../../lib/format";

interface MailSummary {
  id: number;
  to: string;
  subject: string;
  createdAt: string;
}

/**
 * Dev-only inbox: shows emails the app "sent" while SMTP is not configured,
 * so you can click setup links, confirmations and reminders locally.
 */
export function Mailbox() {
  const list = useApi<MailSummary[]>("/dev/outbox");
  const [selected, setSelected] = useState<number | null>(null);
  const mail = useApi<MailSummary & { html: string }>(selected ? `/dev/outbox/${selected}` : null);

  return (
    <div className="container" style={{ padding: "32px 0 64px" }}>
      <div className="ui-head">
        <div>
          <p className="eyebrow">Development only</p>
          <h1 style={{ marginTop: 10 }}>Dev mailbox</h1>
          <p>Emails appear here instead of being sent, because SMTP isn't set up. Links inside them work.</p>
        </div>
        <div className="ui-actions">
          <button type="button" className="btn btn-glass btn-sm" onClick={() => list.reload()}>
            <RefreshCw size={15} aria-hidden="true" /> Refresh
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={async () => {
              await api("/dev/outbox", { method: "DELETE" });
              setSelected(null);
              await list.reload();
            }}
          >
            <Trash2 size={15} aria-hidden="true" /> Clear
          </button>
          <Link to="/" className="btn btn-glass btn-sm">
            Home
          </Link>
        </div>
      </div>

      {list.error ? (
        <div style={{ marginTop: 24 }}>
          <ErrorBox message="The dev mailbox is off (SMTP is configured or the API isn't running)." />
        </div>
      ) : list.loading && !list.data ? (
        <Spinner />
      ) : !list.data?.length ? (
        <div style={{ marginTop: 24 }}>
          <Empty icon={Inbox} title="No emails yet">
            <p>Join the waitlist on the home page and the setup email will show up here.</p>
          </Empty>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) minmax(0, 1fr)", gap: 16, marginTop: 24 }}>
          <ul className="ui-list" aria-label="Emails">
            {list.data.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="ui-list-item"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    color: "inherit",
                    cursor: "pointer",
                    display: "grid",
                    gap: 2,
                    borderColor: selected === m.id ? "var(--violet)" : undefined,
                  }}
                  aria-pressed={selected === m.id}
                  onClick={() => setSelected(m.id)}
                >
                  <strong style={{ fontWeight: 500 }}>{m.subject}</strong>
                  <span className="ui-muted" style={{ fontSize: "0.8125rem" }}>
                    To {m.to} · {timeAgo(m.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="ui-card" style={{ padding: 0, overflow: "hidden", minHeight: 520 }}>
            {mail.data ? (
              <iframe
                title={mail.data.subject}
                // Links open in this tab; no scripts can run inside the email.
                sandbox="allow-top-navigation-by-user-activation allow-popups"
                srcDoc={mail.data.html.replace("<head>", '<head><base target="_top">').replace("<html>", '<html><head><base target="_top"></head>')}
                style={{ width: "100%", height: 640, border: 0, background: "#f4f3fb" }}
              />
            ) : (
              <p className="ui-muted" style={{ padding: 24 }}>
                Pick an email to read it.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
