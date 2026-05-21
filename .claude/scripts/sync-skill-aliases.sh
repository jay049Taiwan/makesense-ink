#!/usr/bin/env bash
# 對每個 .claude/skills/<name>/SKILL.md 自動生成 .claude/commands/<name>.md alias
# 讓 slash command `/` 補完看得到同名 skill
# 已存在的 alias 不會覆蓋(尊重手寫的)
set -e

# 跳到 repo root(腳本在 .claude/scripts/ 下,往上兩層)
cd "$(dirname "$0")/../.."

SKILLS_DIR=".claude/skills"
COMMANDS_DIR=".claude/commands"

mkdir -p "$COMMANDS_DIR"

count=0
skipped=0
for skill_dir in "$SKILLS_DIR"/*/; do
  name=$(basename "$skill_dir")
  alias_file="$COMMANDS_DIR/$name.md"
  skill_file="$skill_dir/SKILL.md"

  [ ! -f "$skill_file" ] && continue

  if [ -f "$alias_file" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  # 用 python3 解析 frontmatter 的 description(支援 single-line 跟 multi-line YAML)
  desc=$(python3 - "$skill_file" <<'PYEOF' 2>/dev/null || echo ""
import sys, re
with open(sys.argv[1], encoding="utf-8") as f:
    content = f.read()
m = re.search(r'^---\s*$(.*?)^---\s*$', content, re.MULTILINE | re.DOTALL)
if not m:
    sys.exit()
fm = m.group(1)
m2 = re.search(r'^description:\s*(\|?)\s*\n?(.*?)(?=^[a-zA-Z_]+:|\Z)', fm, re.MULTILINE | re.DOTALL)
if m2:
    text = m2.group(2).strip()
    text = re.sub(r'\s+', ' ', text)
    print(text[:200])
PYEOF
)

  if [ -z "$desc" ]; then
    desc="Auto-generated alias for skill: $name"
  fi

  cat > "$alias_file" <<EOF
---
description: ${desc}
---

請依使用者輸入的 \$ARGUMENTS 觸發並執行 skill \`$name\`。優先使用 Skill tool 載入 \`$name\` 並按其 SKILL.md 規範執行。
EOF

  count=$((count + 1))
done

echo "[sync-skill-aliases] Generated $count new alias(es), skipped $skipped existing."
