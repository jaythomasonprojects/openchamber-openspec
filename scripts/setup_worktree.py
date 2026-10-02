# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
"""Link shared local paths from the main checkout. Run with uv run --no-project.

Installs affect all linked worktrees; use separate node_modules directories when
branch dependencies differ. Tracked OpenSpec files remain local to each worktree.
"""

import subprocess
import sys
from pathlib import Path

# Repository-relative paths shared with the main checkout.
SHARED_PATHS: list[Path] = [Path("node_modules"), Path("openspec")]


def git(root: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-C", str(root), *args],
        check=True,
        capture_output=True,
        text=True,
    ).stdout


def main() -> None:
    root = Path(
        git(Path(__file__).resolve().parent, "rev-parse", "--show-toplevel").strip()
    )
    # Git lists the main checkout first; -z preserves spaces and unusual names.
    entries = git(root, "worktree", "list", "--porcelain", "-z").split("\0")
    if "bare" in entries[: entries.index("")]:
        raise ValueError(
            "A main checkout is required; bare repositories are unsupported."
        )
    main_root = Path(entries[0].removeprefix("worktree ")).resolve()
    root = root.resolve()
    if root == main_root:
        print("Main checkout: nothing to link.")
        return

    tracked = {
        Path(name)
        for checkout in (root, main_root)
        for name in git(checkout, "ls-files", "-z").split("\0")
        if name
    }
    links: list[tuple[Path, Path]] = []
    for path in SHARED_PATHS:
        if (
            path.is_absolute()
            or not path.parts
            or ".." in path.parts
            or ".git" in path.parts
        ):
            raise ValueError(f"Not a safe repository-relative path: {path}")
        if any(
            path == item or path in item.parents or item in path.parents
            for item in tracked
        ):
            raise ValueError(f"Refusing to share a tracked path: {path}")
        source = main_root / path
        destination = root / path
        if not destination.parent.resolve().is_relative_to(root):
            raise ValueError(f"Destination parent escapes the worktree: {path}")
        if destination.is_symlink() and destination.resolve() == source.resolve():
            print(f"Already linked: {path}")
            continue
        if destination.exists() or destination.is_symlink():
            raise ValueError(f"Destination already exists, left untouched: {path}")
        if not source.exists():
            print(f"Missing in main checkout, skipped: {path}")
            continue
        if any(
            path == other or path in other.parents or other in path.parents
            for other, _ in links
        ):
            raise ValueError(f"Overlapping shared paths: {path}")
        links.append((path, source))

    # Find configuration conflicts before creating any links.
    for path, source in links:
        destination = root / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.symlink_to(source, target_is_directory=source.is_dir())
        print(f"Linked: {path} -> {source}")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f"Worktree setup failed: {error}", file=sys.stderr)
        sys.exit(1)
