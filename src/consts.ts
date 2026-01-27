// Regarding (https://code.visualstudio.com/api/references/vscode-api#window.createStatusBarItem) documentation
// we can set the priority of status bar items to control their order.
// Higher the priority, the more to the left the item will be shown.
export const SERVER_STATUS_BAR_PRIORITY = 100;
export const PROC_MACRO_STATUS_BAR_PRIORITY = 99;

// A lsp string representation of a loading spinner icon.
export const STATUS_BAR_SPINNER = "$(loading~spin)";
