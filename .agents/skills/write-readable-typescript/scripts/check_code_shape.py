#!/usr/bin/env python3
"""Lightweight TypeScript/JavaScript code-shape scanner."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


CODE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"}
SKIP_DIRS = {
    ".git",
    ".next",
    "coverage",
    "dist",
    "build",
    "node_modules",
    "out",
    "tmp",
}

FUNCTION_PATTERNS = [
    re.compile(r"\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)?\s*\("),
    re.compile(r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>"),
    re.compile(r"\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?[A-Za-z_$][\w$]*\s*=>"),
    re.compile(r"^\s*(?:public|private|protected|static|async|\s)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{"),
]


@dataclass
class Finding:
    path: Path
    line: int
    severity: str
    message: str


def iter_code_files(root: Path) -> list[Path]:
    if root.is_file():
        return [root] if root.suffix in CODE_EXTENSIONS else []

    files: list[Path] = []
    for path in root.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.is_file() and path.suffix in CODE_EXTENSIONS:
            files.append(path)
    return sorted(files)


def strip_line_comment(line: str) -> str:
    in_string: str | None = None
    escaped = False
    for index, char in enumerate(line):
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if in_string:
            if char == in_string:
                in_string = None
            continue
        if char in {'"', "'", "`"}:
            in_string = char
            continue
        if char == "/" and index + 1 < len(line) and line[index + 1] == "/":
            return line[:index]
    return line


def brace_delta(line: str) -> int:
    code = strip_line_comment(line)
    return code.count("{") - code.count("}")


def function_name(line: str) -> str | None:
    for pattern in FUNCTION_PATTERNS:
        match = pattern.search(line)
        if match:
            return match.group(1) or "<anonymous>"
    return None


def scan_file(path: Path, max_file_lines: int, max_function_lines: int) -> list[Finding]:
    findings: list[Finding] = []
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()

    if len(lines) > max_file_lines:
        findings.append(
            Finding(
                path=path,
                line=1,
                severity="warn",
                message=f"file has {len(lines)} lines; consider splitting above {max_file_lines}",
            )
        )

    active_name: str | None = None
    active_start = 0
    active_depth = 0

    for index, line in enumerate(lines, start=1):
        if active_name is None:
            name = function_name(line)
            if name and "{" in strip_line_comment(line):
                active_name = name
                active_start = index
                active_depth = brace_delta(line)
                if active_depth <= 0:
                    active_name = None
            continue

        active_depth += brace_delta(line)
        if active_depth <= 0:
            function_lines = index - active_start + 1
            if function_lines > max_function_lines:
                findings.append(
                    Finding(
                        path=path,
                        line=active_start,
                        severity="warn",
                        message=(
                            f"function {active_name} has {function_lines} lines; "
                            f"consider extracting responsibilities above {max_function_lines}"
                        ),
                    )
                )
            active_name = None
            active_start = 0
            active_depth = 0

    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan TS/JS files for long files and approximate long functions.")
    parser.add_argument("path", help="File or directory to scan")
    parser.add_argument("--max-file-lines", type=int, default=500)
    parser.add_argument("--max-function-lines", type=int, default=30)
    args = parser.parse_args()

    root = Path(args.path)
    if not root.exists():
        print(f"Path does not exist: {root}", file=sys.stderr)
        return 2

    findings: list[Finding] = []
    for file_path in iter_code_files(root):
        findings.extend(scan_file(file_path, args.max_file_lines, args.max_function_lines))

    if not findings:
        print("No code-shape findings.")
        return 0

    for finding in findings:
        print(f"{finding.severity}: {finding.path}:{finding.line}: {finding.message}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
