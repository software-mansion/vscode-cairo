import * as lc from "vscode-languageclient/node";

export interface ExpandMacroRequest {
  textDocument: { uri: string };
  position: { line: number; character: number };
}
export type ExpandMacroResponse = string | null;
export const expandMacro = new lc.RequestType<ExpandMacroRequest, ExpandMacroResponse, void>(
  "cairo/expandMacro",
);

export interface ProvideVirtualFileRequest {
  uri: string;
}
export interface ProvideVirtualFileResponse {
  content?: string;
}
export const vfsProvide = new lc.RequestType<
  ProvideVirtualFileRequest,
  ProvideVirtualFileResponse,
  void
>("vfs/provide");

export type ViewAnalyzedCratesResponse = string;
export const viewAnalyzedCrates = new lc.RequestType0<ViewAnalyzedCratesResponse, void>(
  "cairo/viewAnalyzedCrates",
);

export interface ProjectConfigParsingFailedRequest {
  projectConfigPath: string;
}
export const projectConfigParsingFailed =
  new lc.NotificationType<ProjectConfigParsingFailedRequest>("cairo/projectConfigParsingFailed");
