# EVA Title Skill

本仓库是一个通用 AI skill：任何能执行本地命令的 agent 都可以调用 `scripts/render-eva-title.mjs`，用 [itorr/eva-title](https://github.com/itorr/eva-title) 的原始 Canvas 输出 EVA 标题卡 PNG。飞书只是可选 adapter，不是核心依赖。

## Agent Entry Points

| 用途 | 文件 |
| --- | --- |
| Skill 指令 | `SKILL.md` |
| Agent UI 元数据 | `agents/openai.yaml` |
| 一次性 PNG 渲染 CLI | `scripts/render-eva-title.mjs` |
| 常驻 Node + Chrome JSONL 渲染器 | `scripts/eva-title-renderer.mjs` |
| 飞书 adapter | `adapters/feishu/eva-title-bot.py` |
| 飞书配置模板 | `adapters/feishu/.env.example` |

通用调用示例：

```bash
node scripts/render-eva-title.mjs \
  --layout e1 \
  --texts '["安排","泡汤局","领导喜欢"]' \
  --output /absolute/path/eva-title.png
```

`e1` 的 `--texts` 顺序是：竖排、横排、顶部副标题。其余版式的文本输入数量与视觉示例见 `vendor/eva-title/html/layout-help.png`。

## Manual Upload Checklist

无法使用 Git 推送时，请手动上传以下文件和目录，并保持目录结构不变：

```text
SKILL.md
agents/openai.yaml
scripts/render-eva-title.mjs
scripts/eva-title-renderer.mjs
scripts/patch-eva-title-vendor.mjs
scripts/rebuild-vendor.sh
vendor/eva-title/html/
assets/
third_party/eva-title-MIT-LICENSE
third_party/vue-2.6.11-MIT-LICENSE
LICENSE
```

只有需要飞书群 bot 时，再额外上传：

```text
adapters/feishu/eva-title-bot.py
adapters/feishu/.env.example
```

许多网页上传器默认隐藏点开头的文件；如需要飞书 adapter，请确认 `adapters/feishu/.env.example` 也被一并上传。

## Upstream Attribution

Special thanks to [itorr/eva-title](https://github.com/itorr/eva-title), by 卜卜口. This skill uses its original Canvas layouts and keeps the upstream MIT license in this repository. The local renderer adds only the HTTP font proxy integration and local EVA-Matisse loading needed for agent use.

## Vendor And Third Party Files

| 内容 | 本地位置 | 来源 / 用途 |
| --- | --- | --- |
| EVA Canvas 页面、Vue、CSS、布局、内置回退字形与版式总览图 | `vendor/eva-title/html/` | 基于 `itorr/eva-title`，由本地渲染器直接托管 |
| 上游未提交的 CSS/Vue 构建产物与版式总览图源文件 | `assets/vendor-bootstrap/`、`assets/layout-help.png` | `scripts/rebuild-vendor.sh` 重建 `vendor/` 时恢复 |
| 上游 MIT 许可证 | `third_party/eva-title-MIT-LICENSE` | 必须随 `vendor/eva-title/html/` 一并保留 |
| Vue 2.6.11 MIT 许可证 | `third_party/vue-2.6.11-MIT-LICENSE` | 必须随 `assets/vendor-bootstrap/vue.2.6.11.min.js` 一并保留 |
| 本项目 MIT 许可证 | `LICENSE` | 本 skill 的许可证 |

不要手动上传本机字体。`EVA-Matisse_Classic.ttf`、其他 `.ttf` / `.otf` 文件不属于仓库，并且受各自字体授权约束。渲染器会优先使用本机已安装且有授权的 EVA-Matisse；没有时按上游回退机制处理。

## Rebuild Vendor

`vendor/eva-title/html/` 是可重建的第三方目录，不需要手工逐个复制文件。执行：

```bash
scripts/rebuild-vendor.sh
```

该脚本固定拉取 `itorr/eva-title@17257ad5c75bca49ed824a005d13d2de1707cfe9`，运行 `scripts/patch-eva-title-vendor.mjs` 应用本地渲染补丁，再从 `assets/layout-help.png` 恢复 bot/agent 的 16 版式总览图。重建后请检查 `vendor/eva-title/html/layout-help.png` 存在，再提交整个 `vendor/eva-title/html/` 目录和 `third_party/eva-title-MIT-LICENSE`。

## Do Not Upload

`.gitignore` 已排除以下本机内容：`.env`、日志、状态、输出 PNG、下载资源、`node_modules`、缓存、私有字体和编辑器文件。不要将这些内容手动上传到公开仓库。
