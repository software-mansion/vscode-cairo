import { sync as commandExists } from "command-exists";

export const isScarbAvailable = commandExists("scarb");
