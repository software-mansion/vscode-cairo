// Modified code from https://github.com/iliazeus/vscode-ansi/commit/e0864f1aeef78f986474fbcd67da30130caf11ed
// (files: vscode-ansi/src/ansi.ts, vscode-ansi/src/AnsiDecorationProvider.ts, vscode-ansi/src/TextEditorDecorationProvider.ts).

import vscode from "vscode";

export class AnsiDecorationProvider {
  static extractDecorationsRanges(textWithAnsi: string) {
    const lines = textWithAnsi.split("\n");
    const decorationsMap = new Map<string, vscode.Range[]>();

    const parser = new Parser();
    for (let lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
      let totalEscapeLength = 0;

      const line = lines.at(lineNumber)!;
      const spans = parser.appendLine(line);

      for (const span of spans) {
        const { offset, length, ...style } = span;

        if (style.attributeFlags & AttributeFlags.EscapeSequence) {
          totalEscapeLength += length;
          continue;
        }

        const range = new vscode.Range(
          lineNumber,
          offset - totalEscapeLength,
          lineNumber,
          offset + length - totalEscapeLength,
        );

        const styleKey = JSON.stringify(style);
        const rangesForStyle = decorationsMap.get(styleKey) ?? [];
        rangesForStyle.push(range);
        decorationsMap.set(styleKey, rangesForStyle);
      }
    }

    return decorationsMap;
  }

  static getTextWithoutAnsi(textWithAnsi: string): string {
    const lines = textWithAnsi.split("\n");
    const parser = new Parser();

    const chunksWithoutAnsi: string[] = [];
    for (const line of lines) {
      const spans = parser.appendLine(line);
      const textSpans = spans.filter(
        (span) => !(span.attributeFlags & AttributeFlags.EscapeSequence),
      );
      chunksWithoutAnsi.push(
        ...textSpans.map(({ offset, length }) => line.substring(offset, offset + length)),
        "\n",
      );
    }

    return chunksWithoutAnsi.join("");
  }

  setDecorations(decorations: Map<string, vscode.Range[]>, editor: vscode.TextEditor) {
    const decorationTypes = new Map<string, vscode.TextEditorDecorationType>();
    for (const [key, ranges] of decorations ?? []) {
      let decorationType: vscode.ProviderResult<vscode.TextEditorDecorationType> =
        decorationTypes.get(key);

      if (!decorationType) {
        try {
          decorationType = this.resolveDecoration(key);
        } catch (error) {
          console.error(`error providing decorations for key ${key}`, error);
          continue;
        }

        if (decorationType !== undefined) {
          decorationTypes.set(key, decorationType);
        } else {
          console.error(`no decoration resolved for key ${key}`);
          continue;
        }
      }

      editor.setDecorations(decorationType, ranges);
    }
  }

  private _decorationTypes = new Map<string, vscode.TextEditorDecorationType | undefined>([
    ["escape", vscode.window.createTextEditorDecorationType({ opacity: "50%" })],
  ]);

  private resolveDecoration(key: string): vscode.TextEditorDecorationType | undefined {
    let decorationType = this._decorationTypes.get(key);

    if (decorationType) {
      return decorationType;
    }

    const style = JSON.parse(key) as Style;

    // @ts-expect-error copied from vscode-ansi
    decorationType = vscode.window.createTextEditorDecorationType({
      backgroundColor: convertColor(style.backgroundColor),
      color: convertColor(style.foregroundColor),
      fontWeight: style.attributeFlags & AttributeFlags.Bold ? "bold" : undefined,
      fontStyle: style.attributeFlags & AttributeFlags.Italic ? "italic" : undefined,
      textDecoration: style.attributeFlags & AttributeFlags.Underline ? "underline" : undefined,
      opacity: style.attributeFlags & AttributeFlags.Faint ? "50%" : undefined,
    });

    this._decorationTypes.set(key, decorationType);

    return decorationType;
  }

  dispose(): void {
    for (const decorationType of this._decorationTypes.values()) {
      decorationType?.dispose();
    }

    this._decorationTypes.clear();
  }
}

type Color = NamedColor | RgbColor;

enum ColorFlags {
  Named = 1 << 24,
  Bright = 1 << 25,
}

enum NamedColor {
  DefaultBackground = ColorFlags.Named | 0xf0,
  DefaultForeground = ColorFlags.Named | 0xf1,

  Black = ColorFlags.Named | 0,
  Red = ColorFlags.Named | 1,
  Green = ColorFlags.Named | 2,
  Yellow = ColorFlags.Named | 3,
  Blue = ColorFlags.Named | 4,
  Magenta = ColorFlags.Named | 5,
  Cyan = ColorFlags.Named | 6,
  White = ColorFlags.Named | 7,

  BrightBlack = ColorFlags.Named | ColorFlags.Bright | NamedColor.Black,
  BrightRed = ColorFlags.Named | ColorFlags.Bright | NamedColor.Red,
  BrightGreen = ColorFlags.Named | ColorFlags.Bright | NamedColor.Green,
  BrightYellow = ColorFlags.Named | ColorFlags.Bright | NamedColor.Yellow,
  BrightBlue = ColorFlags.Named | ColorFlags.Bright | NamedColor.Blue,
  BrightMagenta = ColorFlags.Named | ColorFlags.Bright | NamedColor.Magenta,
  BrightCyan = ColorFlags.Named | ColorFlags.Bright | NamedColor.Cyan,
  BrightWhite = ColorFlags.Named | ColorFlags.Bright | NamedColor.White,
}

type RgbColor = number;

enum AttributeFlags {
  None = 0,

  Bold = 1 << 0,
  Faint = 1 << 1,
  Italic = 1 << 2,
  Underline = 1 << 3,
  SlowBlink = 1 << 4,
  RapidBlink = 1 << 5,
  Inverse = 1 << 6,
  Conceal = 1 << 7,
  CrossedOut = 1 << 8,
  Fraktur = 1 << 9,
  DoubleUnderline = 1 << 10,
  Proportional = 1 << 11,
  Framed = 1 << 12,
  Encircled = 1 << 13,
  Overlined = 1 << 14,
  Superscript = 1 << 15,
  Subscript = 1 << 16,

  EscapeSequence = 1 << 31,
}

interface Style {
  backgroundColor: Color;
  foregroundColor: Color;
  attributeFlags: AttributeFlags;
  fontIndex: number;
}

const DefaultStyle: Style = {
  backgroundColor: NamedColor.DefaultBackground,
  foregroundColor: NamedColor.DefaultForeground,
  attributeFlags: 0,
  fontIndex: 0,
};

interface Span extends Style {
  offset: number;
  length: number;
}

class Parser {
  private _finalStyle: Style = { ...DefaultStyle };

  public clear(): void {
    this._finalStyle = { ...DefaultStyle };
  }

  public appendLine(text: string): Span[] {
    return this._parseLine(text, this._finalStyle);
  }

  private _parseLine(text: string, style: Style): Span[] {
    const spans: Span[] = [];

    let textOffset = 0;
    let index = 0;

    while (index < text.length) {
      if (text.codePointAt(index) !== 0x1b) {
        let escOffset = text.indexOf("\x1b", index);
        if (escOffset === -1) escOffset = text.length;

        spans.push({ ...style, offset: textOffset, length: escOffset - textOffset });

        textOffset = escOffset;
        index = escOffset;
        continue;
      }

      if (index === text.length - 1) {
        break;
      }

      if (text[index + 1] !== "[") {
        index += 1;
        continue;
      }

      const match = text.slice(index + 2).match(/^([0-9;]*)([a-zA-Z])/);
      if (!match) {
        index += 1;
        continue;
      }

      const argString = match[1]!,
        commandLetter = match[2]!;

      spans.push({
        ...style,
        offset: index,
        length: 2 + argString.length + 1,
        attributeFlags: style.attributeFlags | AttributeFlags.EscapeSequence,
      });

      if (commandLetter === "m") {
        const args = argString
          .split(";")
          .filter((arg) => arg !== "")
          .map((arg) => parseInt(arg, 10));
        if (args.length === 0) args.push(0);

        this._applyCodes(args, style);
      }

      textOffset = index + 2 + argString.length + 1;
      index = textOffset;
    }

    spans.push({ ...style, offset: textOffset, length: index - textOffset });

    return spans;
  }

  private _applyCodes(args: number[], style: Style): void {
    for (let argIndex = 0; argIndex < args.length; argIndex += 1) {
      const code = args[argIndex];

      switch (code) {
        case 0:
          Object.assign(style, DefaultStyle);
          break;

        case 1:
          style.attributeFlags |= AttributeFlags.Bold;
          style.attributeFlags &= ~AttributeFlags.Faint;
          break;

        case 2:
          style.attributeFlags |= AttributeFlags.Faint;
          style.attributeFlags &= ~AttributeFlags.Bold;
          break;

        case 3:
          style.attributeFlags |= AttributeFlags.Italic;
          style.attributeFlags &= ~AttributeFlags.Fraktur;
          break;

        case 4:
          style.attributeFlags |= AttributeFlags.Underline;
          style.attributeFlags &= ~AttributeFlags.DoubleUnderline;
          break;

        case 5:
          style.attributeFlags |= AttributeFlags.SlowBlink;
          style.attributeFlags &= ~AttributeFlags.RapidBlink;
          break;

        case 6:
          style.attributeFlags |= AttributeFlags.RapidBlink;
          style.attributeFlags &= ~AttributeFlags.SlowBlink;
          break;

        case 7:
          style.attributeFlags |= AttributeFlags.Inverse;
          break;

        case 8:
          style.attributeFlags |= AttributeFlags.Conceal;
          break;

        case 9:
          style.attributeFlags |= AttributeFlags.CrossedOut;
          break;

        case 10:
        case 11:
        case 12:
        case 13:
        case 14:
        case 15:
        case 16:
        case 17:
        case 18:
        case 19:
          style.fontIndex = code - 10;
          break;

        case 20:
          style.attributeFlags |= AttributeFlags.Fraktur;
          style.attributeFlags &= ~AttributeFlags.Italic;
          break;

        case 21:
          style.attributeFlags &= ~AttributeFlags.Bold;
          break;

        case 22:
          style.attributeFlags &= ~AttributeFlags.Bold;
          style.attributeFlags &= ~AttributeFlags.Faint;
          break;

        case 23:
          style.attributeFlags &= ~AttributeFlags.Italic;
          style.attributeFlags &= ~AttributeFlags.Fraktur;
          break;

        case 24:
          style.attributeFlags &= ~AttributeFlags.Underline;
          style.attributeFlags &= ~AttributeFlags.DoubleUnderline;
          break;

        case 25:
          style.attributeFlags &= ~AttributeFlags.SlowBlink;
          style.attributeFlags &= ~AttributeFlags.RapidBlink;
          break;

        case 26:
          style.attributeFlags |= AttributeFlags.Proportional;
          break;

        case 27:
          style.attributeFlags &= ~AttributeFlags.Inverse;
          break;

        case 28:
          style.attributeFlags &= ~AttributeFlags.Conceal;
          break;

        case 29:
          style.attributeFlags &= ~AttributeFlags.CrossedOut;
          break;

        case 30:
        case 31:
        case 32:
        case 33:
        case 34:
        case 35:
        case 36:
        case 37:
          style.foregroundColor = ColorFlags.Named | (code - 30);
          break;

        case 38: {
          const colorType = args[argIndex + 1];

          if (colorType === 5) {
            const color = args[argIndex + 2]!;
            argIndex += 2;

            if (0 <= color && color <= 255) {
              style.foregroundColor = this._convert8BitColor(color);
            }
          }

          if (colorType === 2) {
            const r = args[argIndex + 2]!;
            const g = args[argIndex + 3]!;
            const b = args[argIndex + 4]!;
            argIndex += 4;

            if (0 <= r && r <= 255 && 0 <= g && g <= 255 && 0 <= b && b <= 255) {
              style.foregroundColor = (r << 16) | (g << 8) | b;
            }
          }

          break;
        }

        case 39:
          style.foregroundColor = DefaultStyle.foregroundColor;
          break;

        case 40:
        case 41:
        case 42:
        case 43:
        case 44:
        case 45:
        case 46:
        case 47:
          style.backgroundColor = ColorFlags.Named | (code - 40);
          break;

        case 48: {
          const colorType = args[argIndex + 1];

          if (colorType === 5) {
            const color = args[argIndex + 2]!;
            argIndex += 2;

            if (0 <= color && color <= 255) {
              style.backgroundColor = this._convert8BitColor(color);
            }
          }

          if (colorType === 2) {
            const r = args[argIndex + 2]!;
            const g = args[argIndex + 3]!;
            const b = args[argIndex + 4]!;
            argIndex += 4;

            if (0 <= r && r <= 255 && 0 <= g && g <= 255 && 0 <= b && b <= 255) {
              style.backgroundColor = (r << 16) | (g << 8) | b;
            }
          }

          break;
        }

        case 49:
          style.backgroundColor = DefaultStyle.backgroundColor;
          break;

        case 50:
          style.attributeFlags &= ~AttributeFlags.Proportional;
          break;

        case 51:
          style.attributeFlags |= AttributeFlags.Framed;
          style.attributeFlags &= ~AttributeFlags.Encircled;
          break;

        case 52:
          style.attributeFlags |= AttributeFlags.Encircled;
          style.attributeFlags &= ~AttributeFlags.Framed;
          break;

        case 53:
          style.attributeFlags |= AttributeFlags.Overlined;
          break;

        case 54:
          style.attributeFlags &= ~AttributeFlags.Framed;
          style.attributeFlags &= ~AttributeFlags.Encircled;
          break;

        case 55:
          style.attributeFlags &= ~AttributeFlags.Overlined;
          break;

        case 58:
          // TODO: underline colors
          break;

        case 59:
          // TODO: underline colors
          break;

        case 73:
          style.attributeFlags |= AttributeFlags.Superscript;
          style.attributeFlags &= ~AttributeFlags.Subscript;
          break;

        case 74:
          style.attributeFlags |= AttributeFlags.Subscript;
          style.attributeFlags &= ~AttributeFlags.Superscript;
          break;

        case 90:
        case 91:
        case 92:
        case 93:
        case 94:
        case 95:
        case 96:
        case 97:
          style.foregroundColor = ColorFlags.Named | ColorFlags.Bright | (code - 90);
          break;

        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
          style.backgroundColor = ColorFlags.Named | ColorFlags.Bright | (code - 100);
          break;
      }
    }
  }

  private _convert8BitColor(color: number): Color {
    if (0 <= color && color <= 7) {
      return ColorFlags.Named | color;
    }

    if (8 <= color && color <= 15) {
      return ColorFlags.Named | ColorFlags.Bright | (color - 8);
    }

    if (232 <= color && color <= 255) {
      const intensity = ((255 * (color - 232)) / 23) | 0;
      return (intensity << 16) | (intensity << 8) | intensity;
    }

    let color6 = color - 16;

    const b6 = color6 % 6;
    color6 = (color6 / 6) | 0;

    const g6 = color6 % 6;
    color6 = (color6 / 6) | 0;

    const r6 = color6;

    const r = ((255 * r6) / 5) | 0;
    const g = ((255 * g6) / 5) | 0;
    const b = ((255 * b6) / 5) | 0;

    return (r << 16) | (g << 8) | b;
  }
}

const ansiThemeColors: Record<NamedColor, vscode.ThemeColor | undefined> = {
  [NamedColor.DefaultBackground]: undefined,
  [NamedColor.DefaultForeground]: undefined,

  [NamedColor.Black]: new vscode.ThemeColor("terminal.ansiBlack"),
  [NamedColor.BrightBlack]: new vscode.ThemeColor("terminal.ansiBrightBlack"),

  [NamedColor.White]: new vscode.ThemeColor("terminal.ansiWhite"),
  [NamedColor.BrightWhite]: new vscode.ThemeColor("terminal.ansiBrightWhite"),

  [NamedColor.Red]: new vscode.ThemeColor("terminal.ansiRed"),
  [NamedColor.BrightRed]: new vscode.ThemeColor("terminal.ansiBrightRed"),

  [NamedColor.Green]: new vscode.ThemeColor("terminal.ansiGreen"),
  [NamedColor.BrightGreen]: new vscode.ThemeColor("terminal.ansiBrightGreen"),

  [NamedColor.Yellow]: new vscode.ThemeColor("terminal.ansiYellow"),
  [NamedColor.BrightYellow]: new vscode.ThemeColor("terminal.ansiBrightYellow"),

  [NamedColor.Blue]: new vscode.ThemeColor("terminal.ansiBlue"),
  [NamedColor.BrightBlue]: new vscode.ThemeColor("terminal.ansiBrightBlue"),

  [NamedColor.Magenta]: new vscode.ThemeColor("terminal.ansiMagenta"),
  [NamedColor.BrightMagenta]: new vscode.ThemeColor("terminal.ansiBrightMagenta"),

  [NamedColor.Cyan]: new vscode.ThemeColor("terminal.ansiCyan"),
  [NamedColor.BrightCyan]: new vscode.ThemeColor("terminal.ansiBrightCyan"),
};

function convertColor(color: Color): vscode.ThemeColor | string | undefined {
  if (color & ColorFlags.Named) return ansiThemeColors[color as NamedColor];
  return "#" + color.toString(16).padStart(6, "0");
}
