// eslint-disable-next-line @typescript-eslint/no-require-imports
import commandExists = require("command-exists");

export const is_scarb_available = () =>
  commandExists("scarb")
    .then(() => true)
    .catch(() => false);
