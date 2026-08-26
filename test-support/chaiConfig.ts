import { config } from "chai";

// By default chai truncates actual/expected values in assertion messages to 40
// characters, which hides most of the status bar title in CI failure logs.
config.truncateThreshold = 0;
