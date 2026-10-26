# Outstanding Tiny Desk AI 内容与素材

用户于 2026-10-26 要求参考 https://copythatvideo.com/outstanding-tiny-desk-ai 制作一个 Examples 功能页与 What Is、How To、Free 三页，沿用现有按钮和跳转逻辑。初次交付为本地预览；随后用户明确授权将四页与素材来源文案清理一起提交 GitHub、创建并合并 PR、部署 Cloudflare。最终发布状态以对应 PR 和正式域名 `release.json` 为准。

## 页面契约

- 主关键词 Outstanding Tiny Desk AI / Outstanding Tiny Desk AI Video Maker；用户输入的 woutstanding 作为拼写笔误处理，不堆入关键词。
- Hero 与页尾 Generate video 定位本页照片区；照片区按当前模式验证必需图片，再进入 /pricing。复用 generation-workspace.js 与 trend-samples.js，不修改生成接口、支付、积分或登录。
- 两个模式：合照模式必选一图；逐人模式必选主唱，四个乐手/伴唱位可选。隐藏模式输入 disabled，选择可以在切换后保留；没有实现人脸检测或声称已自动识别人数。
- 公共配色与单手机 Hero 复用现有标准；每页恰好三条同主题链接，catalog 驱动导航与目录。
- 不复制参考站的价格、免费额度、时长、退款承诺、免水印保证、播放量、首发时间或搜索增长断言。参考示例不标记为本站实测；不根据 worktree 分工写产品能力限制。

## 事实来源

- 参考页：Copy That Video，上述 URL。只提取主题结构、公开参考视频与图片；英文正文重新撰写，以实际前端操作与结果检查为主。
- 音乐背景：https://www.charliewilsonmusic.com/charlie-wilson-kicks-off-nprs-black-music-month-with-tiny-desk-concert/ 。艺人官网确认 Tiny Desk 演出含 The Gap Band 的 Outstanding；本轮不延伸未验证传播数字或首创者。
- 主片：https://www.tiktok.com/@theburnerfromhe11/video/7698160711830129934
- 案例：https://www.tiktok.com/@lawsnation/video/7699712149400128799
- 案例：https://www.tiktok.com/@whyfantasy_/video/7699860599915695390

## 本地验收（2026-10-26）

- `npm.cmd run check`：108 页、FAQ/schema、目录和链接检查通过，89 个测试通过；`npm.cmd run build` 通过。
- `python scripts/qa-outstanding-tiny-desk.py --output .local/outstanding-tiny-desk/qa`：四页 × 320/390/768/1280px 共 16 次布局检查、12 条互链、三组博客筛选、三条视频实际播放和 Hero 控件通过。
- 合照与逐人两种模式切换、隐藏输入 disabled、照片替换/移除/格式错误提示、主唱必选、四个其他角色可选、仅填可选角色不能替代主唱、有效选图后进入 `/pricing` 均通过。切换模式保留已选择照片的预览状态。
- 1280×800、1366×768、1440×900 的首屏均露出照片区；手机菜单正常。没有页面脚本错误或资源 HTTP 错误。
- 手机验收使用 Chromium 模拟屏宽，未使用实体手机；未执行生成任务或支付。发布按上述后续授权执行。
- 本地预览：`http://127.0.0.1:3084/examples/outstanding-tiny-desk-ai-video-maker`。截图与原始结果在 `.local/outstanding-tiny-desk/qa/`。

## 素材来源与校验

- `/assets/outstanding-tiny-desk/reference.jpg`
  - 来源：https://r2.copythatvideo.com/site/clips/7698160711830129934.jpg?v=mvnhm98c
  - SHA-256：`59625b36d26c7ea9f82e0cd5dfb27415c9a9299bb22cc811badd5e61ac7f2907`
- `/assets/outstanding-tiny-desk/lawsnation.mp4`
  - 来源：https://r2.copythatvideo.com/site/clips/7699712149400128799.mp4?v=mvnhn2ia
  - SHA-256：`b8a46890b6ce78d8c1b751cf8443549bb1fb39cc3e9419244369a0829007dfc0`
- `/assets/outstanding-tiny-desk/lawsnation.jpg`
  - 来源：https://r2.copythatvideo.com/site/clips/7699712149400128799.jpg?v=mvnhn2ia
  - SHA-256：`6872ab5fde53cdb46f12ca918c85572d5cb61eedfcb3a45238024a3fdc9d4504`
- `/assets/outstanding-tiny-desk/reference.mp4`
  - 来源：https://r2.copythatvideo.com/site/clips/7698160711830129934.mp4?v=mvnhm98c
  - SHA-256：`f658326ebb1fd92c1e6e8d5e4f3ef03a58fa5e85801464f1ea8066c161996e9b`
- `/assets/outstanding-tiny-desk/cover.webp`
  - 来源：https://r2.copythatvideo.com/site/trends/outstanding-tiny-desk-ai/cover.webp
  - SHA-256：`b81cbff45c1e395ddbf0d793d27015cad973a461c8f4426c182adad09b42c8cc`
- `/assets/outstanding-tiny-desk/whyfantasy.jpg`
  - 来源：https://r2.copythatvideo.com/site/clips/7699860599915695390.jpg?v=mvnhnrbj
  - SHA-256：`77cbadc455dba2ba9752f3d3f384f80a8992faf88c847e3416dc26c9b3782486`
- `/assets/outstanding-tiny-desk/beat-1.webp`
  - 来源：https://r2.copythatvideo.com/site/trends/outstanding-tiny-desk-ai/beat-1.webp?v=7698160711830129934-0.6-mvnhm98c
  - SHA-256：`d657db714184c04d3271a100129e73bea9091b58aac256d343ddf405858137e1`
- `/assets/outstanding-tiny-desk/whyfantasy.mp4`
  - 来源：https://r2.copythatvideo.com/site/clips/7699860599915695390.mp4?v=mvnhnrbj
  - SHA-256：`04c78b3610d654ad7d3b7de788b05621b7d1ab2b9c13166795797866eac16409`
- `/assets/outstanding-tiny-desk/beat-2.webp`
  - 来源：https://r2.copythatvideo.com/site/trends/outstanding-tiny-desk-ai/beat-2.webp?v=7698160711830129934-8.65-mvnhm98c
  - SHA-256：`0fa8aac09f837c0afeabd469c4530e18cc9d9b81430a7d6038175501a011708e`
- `/assets/outstanding-tiny-desk/scene.webp`
  - 来源：https://r2.copythatvideo.com/site/trends/outstanding-tiny-desk-ai/scene.webp?v=7698160711830129934-4.5-mvnhm98c
  - SHA-256：`4fd736d8abc2b30e1d90e34499531501d515f59c6be78dba736f4474d30cdcfe`
- `/assets/outstanding-tiny-desk/beat-4.webp`
  - 来源：https://r2.copythatvideo.com/site/trends/outstanding-tiny-desk-ai/beat-4.webp?v=7698160711830129934-13.5-mvnhm98c
  - SHA-256：`8496c85c6e59d55441ac881edfee1b55c78c2f14d9c947b7c10dbfb595637388`
- `/assets/outstanding-tiny-desk/beat-3.webp`
  - 来源：https://r2.copythatvideo.com/site/trends/outstanding-tiny-desk-ai/beat-3.webp?v=7698160711830129934-10.9-mvnhm98c
  - SHA-256：`6a24414a03457ad4988954a915ebeff825be4a59a3f11b82aebbbf6ff02b4c5e`
- `/assets/outstanding-tiny-desk/photo-example.webp`
  - 来源：https://r2.copythatvideo.com/site/samples/man-dad.webp
  - SHA-256：`fa7568a05a14d16f049ce52bc94083ea6178d9737ed0e28f1cdb5cb13f8239bf`
