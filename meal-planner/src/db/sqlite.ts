import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sqlite = require("node:sqlite") as typeof import("node:sqlite");

export const DatabaseSync = sqlite.DatabaseSync;
export type DatabaseSyncInstance = InstanceType<typeof sqlite.DatabaseSync>;
