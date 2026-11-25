import type { Db } from "../db/index.js";
import type { Mailer } from "../mail/mailer.js";

/** Everything a service needs. Passed in (not imported) so tests can use an in-memory DB and mailbox. */
export interface Deps {
  db: Db;
  mailer: Mailer;
  appUrl: string;
  now: () => Date;
}
