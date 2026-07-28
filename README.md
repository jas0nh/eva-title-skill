# EVA Title Skill

一个可安装到 Hermes 的本地 EVA 标题卡 skill。它直接运行 [itorr/eva-title](https://github.com/itorr/eva-title) 的 `layouts.js` 与 `make.js`，仅用轻量原生 Canvas/Skia 兼容层替代浏览器 DOM。16 种版式的坐标、缩放、居中、颜色、阴影、噪点和 640×480 输出均由 vendor 代码决定；运行时不需要 Chrome、Playwright、网页服务或远程字体代理。

## Hermes

安装 skill 源后，使用以下标识安装到 `~/.hermes/skills/self-built/eva/`：

```bash
hermes skills install jas0nh/eva-title-skill/skills/eva --category self-built
```

进入已安装目录后运行一次 `npm ci --omit=dev`。渲染例子：

```bash
node scripts/render-eva-title.mjs --layout e24 --texts '["测试"]' --output /tmp/eva-test.png
```

## 本机字体

该 skill 不携带字体。安装者须拥有 Matisse 使用授权，并将 `FOT-Matisse Pro EB.otf` 安装到当前 macOS 用户的 `~/Library/Fonts/`；同时安装开源的 `SourceHanSerifSC-Heavy.otf`。渲染器会按上游映射先将简体转繁体、优先使用 Matisse，缺字才回退到思源宋体 Heavy；也可以用 `--font` 指向另一个本机 Matisse 文件。字体缺失时渲染会失败，而不是使用无提示的替代字形。

## 飞书 adapter

`adapters/feishu/` 是可选传输层，不属于 Hermes skill 包。它调用同一个一次性原生 CLI；访问凭据只能由其运行环境注入，adapter 不再读取 macOS Keychain。

## 归属与许可证

版式实现、Canvas 绘制函数、简繁映射和 Matisse 字形清单来自 [itorr/eva-title](https://github.com/itorr/eva-title)，随附 vendor/参考文件适用上游 MIT 许可证，见 [third_party/eva-title-MIT-LICENSE](third_party/eva-title-MIT-LICENSE)。思源宋体来自 [Adobe Source Han Serif](https://github.com/adobe-fonts/source-han-serif)，本仓库不得提交或分发本机字体文件。
