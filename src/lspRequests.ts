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

export interface PathAndVersion {
  path: string;
  version: string;
}

export interface ToolchainInfoResponse {
  ls: PathAndVersion;
  scarb: PathAndVersion | null;
}

export const toolchainInfo = new lc.RequestType0<ToolchainInfoResponse, void>(
  "cairo/toolchainInfo",
);

export interface ViewSyntaxTreeRequest {
  textDocument: { uri: string };
  position: { line: number; character: number };
}

export type ViewSyntaxTreeResponse = string | null;

export const viewSyntaxTree = new lc.RequestType<
  ViewSyntaxTreeRequest,
  ViewSyntaxTreeResponse,
  void
>("cairo/viewSyntaxTree");
