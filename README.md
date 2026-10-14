# Burning Bridges 本地复刻

根据 https://burningbridgesaivideo.pro/ 在 2026-10-11 的公开页面制作。保留原站 HTML、CSS、字体、图片、视频、页面链接与 SEO 信息，提供本地交互层。

## 打开本地网站

1. 把此仓库下载或克隆到电脑，在 VS Code 打开 `burningbridges` 项目文件夹。
2. 打开“终端 → 新建终端”，执行：

   ```powershell
   npm.cmd ci
   npm.cmd run dev
   ```

3. 看到 `Local commerce website: http://localhost:3001` 后，在浏览器打开该地址。终端保持运行；停止时按 `Ctrl+C`。
4. 如果端口已被占用，使用另一个端口：

   ```powershell
   $env:PORT=3002
   npm.cmd run dev
   ```

   然后打开 `http://localhost:3002`。完整本地流程需要 Node.js 24；测试数据库保存在忽略提交的 `.local/commerce.sqlite`。本地服务器绑定 127.0.0.1，默认关闭真实 checkout，不读取或借用支付私钥。纯静态浏览可运行 `npm.cmd run dev:static`（3000 端口）。

## 修改位置

| 要改什么 | 文件或目录 | 操作 |
| --- | --- | --- |
| 首页文案与结构 | `public/index.html` | 搜索页面上现有英文文案，局部替换并保存 |
| 价格页 | `public/pricing/index.html` | 月付和一次性套餐；同步修改服务器套餐和 Waffo 产品 |
| 博客首页 | `public/blog/index.html` | 修改文章卡片与链接 |
| 两篇博客 | `public/blog/文章路径/index.html` | 修改正文 |
| 三个 SEO 落地页 | `public/burning-bridges-*/index.html` | 修改对应页面正文 |
| 政策页 | `public/privacy-policy/index.html`、`public/terms-of-service/index.html`、`public/refund-policy/index.html` | 修改对应条款 |
| 新增或覆盖样式 | `public/local.css` | 在文件末尾添加样式，避免直接编辑原站压缩 CSS |
| 页面交互 | `public/local.js`、`public/commerce.js` | 照片草稿、账号、付款返回、任务状态和下载 |
| 订单与积分 | `src/catalog.mjs`、`src/commerce.mjs`、`src/worker.mjs` | 服务器价格、回调核验、积分账本与 API |
| 账号及数据库 | `src/auth.mjs`、`migrations/` | 会话、密码、恢复码与 D1 表结构 |
| 原站样式与字体 | `public/_next/static/` | 原始编译后的资源，仅供保真复刻使用 |
| 图片与视频 | `public/assets/` | 替换同名文件，或在 HTML 中修改路径 |
| 站点页面及资源清单 | `site.config.json` | 自查脚本使用的清单；新增页面时同步更新 |
| 示例视频映射 | `public/media.json` | 三段示例视频的本地路径 |

保存前端文件后刷新浏览器即可看到变化；修改服务器代码后重启本地服务。HTML 已整理为缩进文本，后台为本项目的 Cloudflare Worker 与 D1 实现。

## 已实现与边界

- 16 个公开页面，资源全部本地化；没有依赖原站运行时的 JS。
- FAQ、照片预览与 8MB 校验、格式和分辨率选择、两组价格选项、导航、主题及示例音频。
- 账号注册/登录、一次性恢复码、HttpOnly 会话、Waffo 托管支付、签名回调、幂等积分发放、账期/有效期、原子扣积分、失败退积分、模拟结果和受保护下载。
- 照片与设置保存在浏览器 IndexedDB，付款返回及刷新可以恢复；移除或退出账号清除，七天以上的草稿在下一次访问时清除。模拟流程不上传照片到服务器或 AI 服务。
- Waffo 当前仅 Test 环境，未创建 Production 产品或密钥；真实收款还需要商户资质审核。模拟结果明确标为参考视频，不能消耗正式积分。AI provider 尚待另行接入。
- canonical、OG URL、文章结构化数据、sitemap 和 robots 已配置为 `https://burningbridgesaivideo.pro`。客服邮箱已统一为 `support@burningbridgesaivideo.pro`；邮箱收信能力尚未验证。

## 检查与构建

在项目目录的 PowerShell 终端依次执行：

```powershell
npm.cmd run check
npm.cmd run build
```

看到页面/统计/文案检查及支付测试全部通过、`Build complete: dist/` 即成功。`dist` 是前端资源；Wrangler 同时打包 `src/worker.mjs` 后台。修改后重新运行构建。

## 研究证据

- `研究与验收.md`：复刻范围、验证结果、剩余限制。
- `SUBMISSION-AUDIT.md`：提交 GitHub 的文件范围和只留本地的文件类别。
- `DEPLOYMENT.md`：Cloudflare 构建、部署和域名检查方法。
- 原始 HTML、截图、抓取脚本、原始价格研究数据只留在制作机器，已加入 `.gitignore`，不随仓库发布。

日常改站编辑 `public`，执行检查与构建即可。GitHub Actions 只负责验证，绿色验证不代表已经部署。

## 制作指南与参考库

2026-10-13 按顺序完成 8 个内容方向，沿用英文站点风格：

1. `/burning-bridges-ai-prompt`：原创场景与动作参考提示词，用户主动点击复制；复制失败时选中文字并提示手动复制。提示词未经过付费模型实测，不宣称为生产模板。
2. `/guides/photo-guide`：单主体、光线、裁切、8MB 限制及原创构图示意图。
3. `/blog/how-to-make-burning-bridges-video`：站内准备流程与第三方制作方法，明确照片、付款、积分、任务和实际视频的区别。
4. `/blog/burning-bridges-ai-tools-compared`：按输入素材和控制需求比较制作方法，保留官方来源及核查日期；不虚构竞品价目、免费额度或效果。
5. `/examples`：三个已有本地参考视频，手动播放，明确其来源与模型设置未记录；不伪装本站生成成果，不虚构前后对比。
6. `/guides/troubleshooting`：实际账号/任务错误、第三方效果问题、退款区别及支持信息。
7. `/burning-bridges-music-video-ai`：音轨检查、TikTok/Reels 发布、横竖屏和音乐使用边界。
8. `/blog/burning-bridges-ai-free`：免费准备、拍摄、编辑及可能存在的第三方试用限制；不承诺免费 AI 生成。

`/blog` 为指南目录；首页、全站 Examples 导航与页脚已连接新页面。新增页面同时进入 `site.config.json` 和 sitemap。共用布局在 `public/local.css`，提示词交互在 `public/guides.js`。新增照片示意图为 SVG，不是真实照片或生成结果。

## 网站统计

全站共用 public/analytics.js。GA4 衡量 ID：G-LSG4H51443；Clarity 项目 ID：ywbipqd0b5。这些是公开标识，可以提交；登录凭据、OAuth Token、API Secret 不提交。GSC 使用 DNS 网域验证，无需网站脚本，验证 TXT 记录必须保留。

统计仅在 https://burningbridgesaivideo.pro 运行；localhost 和 workers.dev 不采集。GA4 关闭增强型衡量、Google signals 和广告个性化，页面和来源 URL 去掉 query/hash。Clarity 使用严格文本屏蔽，HTML 明确屏蔽照片/生成器和输入框；带 query 的访问不加载 Clarity。不要移除遮罩或新增传送文件名、照片、邮箱、prompt 的事件。

修改 ID 后执行 npm run check，再按 DEPLOYMENT.md 发布。脚本存在或本地检查通过不等于平台收到数据，发布后检查 GA4 实时报告及 Clarity 数据接收状态。

## 产品规格与业务规则

本节是页面与支付实现共用的规则；服务器套餐是 `src/catalog.mjs`，Waffo 产品和页面金额必须同步。

- 单张照片，最大 8MB；格式 Auto、16:9、1:1、9:16。480P / 720P Standard / 1080P Pro 分别显示 50 / 100 / 200 积分估算。
- 月付 Starter $19 / 400 credits，Creator $39 / 900 credits，Studio $79 / 2,000 credits。每月续费；取消停止后续续费；当期积分按实际付费账期有效，不滚存。
- 一次性 100 credits / $9.90 / 30 天，200 credits / $14.90 / 30 天，500 credits / $29.90 / 90 天。有效期从积分发放起算。没有年付及 1,500 credits 套餐。
- 选图、看示例不扣生成积分。付款成功、积分到账、任务提交和生成完成是不同状态。确认失败且无交付的任务退回所扣积分；现金退款按退款政策审核。
- 未登录或余额不足的生成入口去定价页；选择套餐后先登录，再打开 Waffo hosted checkout。只在核验签名、环境、店铺、订单、账号、套餐、金额和付款状态后发积分；月付须同时收到当期付款与账期信息。付款返回参数不发积分。
- 积分足够时用户主动提交任务才扣积分；任务重试不重复扣费。模拟结果使用现有参考视频，选定的分辨率及格式记录在任务中，不伪装成真实 AI 渲染。
- 不承诺固定完成时间、完美相似度、自动人工审核、无限存储或未经授权的商业使用权。模拟视频结果必须与真实生成区分。
- 隐私说明披露 Waffo、D1 账号/订单/积分记录、浏览器草稿及 GA4/Clarity。账号、素材、恢复码和支付界面屏蔽录屏；不新增打断式统计弹窗。
- 退款条款不把使用积分自动当作放弃法定撤回权，参考欧盟官方消费者说明：https://europa.eu/youreurope/citizens/consumers/shopping/returns/index_en.htm 。上线 checkout 时按适用要求实现实际确认流程。

运行 npm run check 验证页面、统计保护、FAQ/结构化数据、套餐数字、资源和锚点。

支付配置与验收状态见 `docs/payments.md`。私钥、测试账号凭据、数据库、抓包和截图只留本地；`npm run audit:staged` 检查提交白名单与凭据模式。

Google 登录已按模板的 Better Auth / Drizzle / D1 方案局部适配，配置及验证记录见 `docs/google-login.md`。缺少必要配置时禁用 Google 按钮，原邮箱登录保留。已有邮箱账号先用密码登录，再主动绑定同邮箱 Google 身份，以保留原订单和积分。

- Generation architecture and local provider candidate: [docs/generation.md](docs/generation.md).

## Gas Station Dance AI 内页

- 路径：`/gas-station-dance-ai`；页面文件：`public/gas-station-dance-ai/index.html`。
- 独立样式和交互：`public/gas-station.css`、`public/gas-station.js`。
- 三张原创 SVG 分镜素材：`public/assets/gas-station-{dance,selfie,exit}.svg`，用于场景说明，不是生成结果。
- 单人/三人照片预览，仅使用当前标签页临时 URL；无上传、持久化、任务提交或扣积分。切换单人模式清除另外两张照片。
- 支持 JPG/PNG/WebP、8MB 上限和 512 × 512 最小尺寸；刷新或关闭清除照片。
- 页面包含 canonical、OG、面包屑、与可见内容一致的 FAQ schema，并加入 sitemap 和全站页脚。
- 本地复查依次运行 `npm.cmd run check`、`npm.cmd run build`；静态开发预览使用 `npm.cmd run dev:static`，访问 `http://localhost:3000/gas-station-dance-ai`。

## 视频项目分类导航

`/examples` 是分类目录；Drake 的三段参考视频移至 `/burning-bridges-video-ai`。全站 Examples 下拉菜单与目录卡片来自 `public/video-projects.json`。新增项目时填写 categories/projects，确保 url 已加入 site.config.json 的 routes、素材存在，再运行 `npm.cmd run sync:video-projects`。check 和 build 会自动同步导航；不要手工修改 VIDEO NAV / VIDEO CATALOG 标记内的生成内容。

下拉菜单支持点击展开、外部点击关闭、Esc 关闭并归还焦点、键盘 Tab 导航；目录分类按钮会更新可见项目及数量。
