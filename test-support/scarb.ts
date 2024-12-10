import commandExists from "command-exists";

let isScarbAvailableState: null | boolean = null;

export const isScarbAvailable = async () =>
  (isScarbAvailableState ??= await commandExists("scarb")
    .then(() => true)
    .catch(() => false));
