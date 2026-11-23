#!/usr/bin/env bash
set -euo pipefail

# Persist ~/.local/bin on PATH for non-interactive shells that source ~/.bashrc via BASH_ENV
touch "$HOME/.bashrc"
sed -i '/case \$- in/,/esac/d' "$HOME/.bashrc" 2>/dev/null || true
grep -qxF 'export PATH="$HOME/.local/bin:$PATH"' "$HOME/.bashrc" || echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
export PATH="$HOME/.local/bin:$PATH"

# 1. Install RTK (Rust Token Killer) and verify `rtk gain` (rules out Rust Type Kit collision)
if ! command -v rtk >/dev/null 2>&1 || ! rtk gain >/dev/null 2>&1; then
  curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh
fi
rtk --version
rtk gain >/dev/null
rtk init -g --agent antigravity --auto-patch

# 2. Install Vercel skills CLI for find-skills
if ! command -v skills >/dev/null 2>&1; then
  npm install -g skills --no-audit --no-fund
fi
skills --version

# 3. Install coding skills idempotently into ~/.agents/skills
SKILLS_DIR="$HOME/.agents/skills"
mkdir -p "$SKILLS_DIR"/{ponytail,caveman,find-skills,headroom,rtk}

if [ ! -f "$SKILLS_DIR/ponytail/SKILL.md" ]; then
  curl -fsSL https://raw.githubusercontent.com/DietrichGebert/ponytail/main/skills/ponytail/SKILL.md \
    -o "$SKILLS_DIR/ponytail/SKILL.md"
fi

if [ ! -f "$SKILLS_DIR/caveman/SKILL.md" ]; then
  curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/skills/caveman/SKILL.md \
    -o "$SKILLS_DIR/caveman/SKILL.md"
fi

if [ ! -f "$SKILLS_DIR/find-skills/SKILL.md" ]; then
  curl -fsSL https://raw.githubusercontent.com/vercel-labs/skills/main/skills/find-skills/SKILL.md \
    -o "$SKILLS_DIR/find-skills/SKILL.md"
fi

if [ ! -f "$SKILLS_DIR/headroom/SKILL.md" ]; then
  TMP_HEADROOM="$(mktemp -d)"
  trap 'rm -rf "$TMP_HEADROOM"' EXIT
  git clone --depth=1 https://github.com/roman-ryzenadvanced/headroom-skill.git "$TMP_HEADROOM/headroom"
  rm -rf "$TMP_HEADROOM/headroom/.git" "$TMP_HEADROOM/headroom/.gitignore"
  cp -r "$TMP_HEADROOM/headroom"/. "$SKILLS_DIR/headroom/"
  rm -rf "$TMP_HEADROOM"
  trap - EXIT
fi

cat <<'EOF' > "$SKILLS_DIR/rtk/SKILL.md"
---
name: rtk
description: >
  Use RTK (Rust Token Killer) as a CLI proxy to condense verbose shell output
  (git, npm/pnpm, cargo, pytest, vitest, jest, ls, grep, docker) while keeping
  every signal and preserving exit codes. Use whenever running shell commands
  in coding sessions, or when checking token savings with `rtk gain`.
---

# RTK

Prefix external programs with `rtk`: `rtk git status`, `rtk cargo test`,
`rtk npm run build`, `rtk ls src/`; keep prefixes inside chains such as `rtk git add . &&
rtk git commit -m "msg"`. Programs without an RTK filter run as-is, so prefixing from `PATH`
is safe. Do not prefix shell builtins or keywords: `test`, `[`, `read`, `cd`, `echo`, `export`,
`eval`, `source`, `printf`, or shadowed `env`; run the native command directly when needed.

## Command output

Command output here is condensed to save tokens, keeping every signal and
dropping costly noise. Treat it as the complete result: run commands
normally, and batch related commands into one call to avoid extra turns.
Truncated results state their recovery path in their own output. Re-run a
command as `rtk bypass <cmd>` only when its result is unusable: empty when
output was clearly expected, contradicting its exit code, or garbled.

## Essential commands

- `rtk gain` / `rtk gain --history` — token savings, overall and per command.
- `rtk bypass <cmd>` — run a command unfiltered, still tracked.
- `RTK_DISABLED=1 <cmd>` — skip RTK for one command.
- `rtk discover` — find past commands RTK could have condensed.
- `rtk init --show` — inspect installed RTK hook/plugin state.
EOF
