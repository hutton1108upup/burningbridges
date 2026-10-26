# 素材来源展示清理 · 2026-10-26

按用户本次要求，删除前台的素材提供网站、第三方来源提示、作者账号、Source 标签，以及只讨论素材出处的 FAQ；同步清理 accessibility/SEO 标签与 FAQ/schema。此要求取代之前要求在页面中展示素材署名的规则。

内部素材记录、资源文件、哈希与原始视频均保留，不把素材改标为本站生成。文章事实引用、音乐/作品背景、隐私与服务条款不在素材标签清理范围。

## 盘点

- 清理 49 页：播放器下方说明、账号栏、视频/图片说明、案例作者标题、正文出处句、页脚、FAQ、metadata 与目录摘要。
- 纯来源文字删除；仍有意义的场景描述保留并修正文句。
- `scripts/media-label-policy.mjs` 接入 `scripts/check-copy.mjs`，阻止上述标签重新进入页面。三条边界测试验证不会误拦文章引用、源照片说明、客服邮箱与内部资源路径。

## 验收

- `npm.cmd run check`：108 页文案与 348 条 FAQ/schema 检查、92 个测试通过。
- `npm.cmd run build` 通过。
- 全站 108 页 × 四种宽度（320/390/768/1280px）共 432 次布局检查通过，无脚本错误。
- Tiny Desk 四页的 16 次布局、12 条互链、两种照片模式与必需/可选角色、照片替换/移除/格式提示、有效图片后跳价格页、三条视频及控件均通过。
- 前台清理记录与原文快照：`.local/media-labels-inventory.json`、`.local/media-labels-before/`。浏览器证据：`.local/media-labels-qa/`。
- 初次交付为本地修改；用户随后于 2026-10-26 授权与 Outstanding Tiny Desk 四页一起提交 GitHub、创建并合并 PR、部署 Cloudflare。最终发布状态以对应 PR 和正式域名 `release.json` 为准。

## 清理页面

- `public/blog/babydoll-dance-ai-trend-explained/index.html`
- `public/blog/bby-wow-guy-ai-video-explained/index.html`
- `public/blog/bby-wow-guy-ai-video-free/index.html`
- `public/blog/cheba-man-ai-trend-explained/index.html`
- `public/blog/firestarter-ai-trend-explained/index.html`
- `public/blog/how-to-make-alors-on-danse-ai-video/index.html`
- `public/blog/how-to-make-babydoll-dance-ai-video/index.html`
- `public/blog/how-to-make-bby-wow-guy-ai-video/index.html`
- `public/blog/how-to-make-bulin-47-ai-video/index.html`
- `public/blog/how-to-make-cheba-man-ai-dance-video/index.html`
- `public/blog/how-to-make-firestarter-ai-dance-video/index.html`
- `public/blog/how-to-make-ghostface-ai-video/index.html`
- `public/blog/how-to-make-halloween-costume-ai-video/index.html`
- `public/blog/how-to-make-i-feel-like-nicole-ai-video/index.html`
- `public/blog/how-to-make-nicole-kidman-dance-ai-video/index.html`
- `public/blog/how-to-make-outstanding-tiny-desk-ai-video/index.html`
- `public/blog/how-to-make-rumpelstiltskin-ai-video/index.html`
- `public/blog/how-to-make-storm-ii-ai-video/index.html`
- `public/blog/how-to-make-thriller-dance-ai-video/index.html`
- `public/blog/how-to-make-zombie-love-story-ai-video/index.html`
- `public/blog/nicole-kidman-dance-ai-trend-explained/index.html`
- `public/blog/outstanding-tiny-desk-ai-explained/index.html`
- `public/blog/outstanding-tiny-desk-ai-free/index.html`
- `public/blog/rumpelstiltskin-ai-trend-explained/index.html`
- `public/blog/storm-ii-ai-trend-explained/index.html`
- `public/blog/thriller-dance-ai-trend-explained/index.html`
- `public/blog/thriller-dance-ai-video-free/index.html`
- `public/blog/window-peeper-ai-trend-explained/index.html`
- `public/blog/window-peeper-ai-video-free/index.html`
- `public/blog/zombie-love-story-ai-trend-explained/index.html`
- `public/bulin-47-ai-video-maker/index.html`
- `public/examples/ai-smalltown-boy/index.html`
- `public/examples/alors-on-danse-ai-video-generator/index.html`
- `public/examples/babydoll-dance-ai-video/index.html`
- `public/examples/bby-wow-guy-ai-video-maker/index.html`
- `public/examples/cheba-man-ai-dance-maker/index.html`
- `public/examples/firestarter-ai-dance-maker/index.html`
- `public/examples/ghostface-ai-video-maker/index.html`
- `public/examples/halloween-costume-ai/index.html`
- `public/examples/i-feel-like-nicole-ai-video/index.html`
- `public/examples/index.html`
- `public/examples/nicole-kidman-dance-ai-video-maker/index.html`
- `public/examples/outstanding-tiny-desk-ai-video-maker/index.html`
- `public/examples/rumpelstiltskin-ai-video-maker/index.html`
- `public/examples/storm-ii-ai-video/index.html`
- `public/examples/thriller-dance-ai-video-maker/index.html`
- `public/examples/window-peeper-ai-video-maker/index.html`
- `public/flying-entrance/index.html`
- `public/index.html`
