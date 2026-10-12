# Burning Bridges 本地复刻

根据 https://burningbridgesaivideo.pro/ 在 2026-10-11 的公开页面制作。保留原站 HTML、CSS、字体、图片、视频、页面链接与 SEO 信息，提供本地交互层。

## 打开本地网站

1. 把此仓库下载或克隆到电脑，在 VS Code 打开 `burningbridges` 项目文件夹。
2. 打开“终端 → 新建终端”，执行：

   ```powershell
   npm.cmd run dev
   ```

3. 看到 `Local website: http://localhost:3000` 后，在浏览器打开该地址。终端保持运行；停止时按 `Ctrl+C`。
4. 如果端口已被占用，使用另一个端口：

   ```powershell
   $env:PORT=3001
   npm.cmd run dev
   ```

   然后打开 `http://localhost:3001`。本地预览不需要第三方依赖，运行只需要 Node.js 20 或更高版本。部署及 CI 首先执行 `npm.cmd ci`，安装锁定版本的 Wrangler。

## 修改位置

| 要改什么 | 文件或目录 | 操作 |
| --- | --- | --- |
| 首页文案与结构 | `public/index.html` | 搜索页面上现有英文文案，局部替换并保存 |
| 价格页 | `public/pricing/index.html` | 分别修改月付、年付和一次性套餐区块 |
| 博客首页 | `public/blog/index.html` | 修改文章卡片与链接 |
| 两篇博客 | `public/blog/文章路径/index.html` | 修改正文 |
| 三个 SEO 落地页 | `public/burning-bridges-*/index.html` | 修改对应页面正文 |
| 政策页 | `public/privacy-policy/index.html`、`public/terms-of-service/index.html`、`public/refund-policy/index.html` | 修改对应条款 |
| 新增或覆盖样式 | `public/local.css` | 在文件末尾添加样式，避免直接编辑原站压缩 CSS |
| 本地交互 | `public/local.js` | 修改上传预览、积分、FAQ、视频、导航和价格切换 |
| 原站样式与字体 | `public/_next/static/` | 原始编译后的资源，仅供保真复刻使用 |
| 图片与视频 | `public/assets/` | 替换同名文件，或在 HTML 中修改路径 |
| 站点页面及资源清单 | `site.config.json` | 自查脚本使用的清单；新增页面时同步更新 |
| 示例视频映射 | `public/media.json` | 三段示例视频的本地路径 |

保存文件后刷新浏览器即可看到变化。HTML 已整理为缩进文本，方便搜索和局部编辑。当前版本是可修改的静态前端复刻，并非原站 Next.js/React 源码工程。

## 已实现与边界

- 11 个公开页面，资源全部本地化；没有依赖原站运行时的 JS。
- FAQ 展开、照片选择与本地预览、8MB 校验、照片移除、格式与分辨率选择、积分展示、视频选择与音频开关、手机导航、主题切换、价格页三组选项。
- 照片仅用于浏览器本地预览，不会上传。登录、购买、生成按钮会显示本地预览说明，不发起账号、付款或 AI 服务请求。
- 登录弹窗、真实支付、账号积分、任务队列、生成与下载需要原站源码及后台配置才能恢复；公开网站无法提供这些私有实现。
- canonical、OG URL、文章结构化数据、sitemap 和 robots 已配置为 `https://burningbridgesaivideo.pro`。客服邮箱已统一为 `support@burningbridgesaivideo.pro`；邮箱收信能力尚未验证。

## 检查与构建

在项目目录的 PowerShell 终端依次执行：

```powershell
npm.cmd run check
npm.cmd run build
```

看到 `PASS: 11 pages` 和 `Build complete: dist/` 即成功。`dist` 是静态构建产物，不包含后台服务。修改后重新运行构建。

## 研究证据

- `研究与验收.md`：复刻范围、验证结果、剩余限制。
- `SUBMISSION-AUDIT.md`：提交 GitHub 的文件范围和只留本地的文件类别。
- `DEPLOYMENT.md`：Cloudflare 构建、部署和域名检查方法。
- 原始 HTML、截图、抓取脚本、原始价格研究数据只留在制作机器，已加入 `.gitignore`，不随仓库发布。

日常改站编辑 `public`，执行检查与构建即可。GitHub Actions 只负责验证，绿色验证不代表已经部署。

## 网站统计

全站共用 public/analytics.js。GA4 衡量 ID：G-LSG4H51443；Clarity 项目 ID：ywbipqd0b5。这些是公开标识，可以提交；登录凭据、OAuth Token、API Secret 不提交。GSC 使用 DNS 网域验证，无需网站脚本，验证 TXT 记录必须保留。

统计仅在 https://burningbridgesaivideo.pro 运行；localhost 和 workers.dev 不采集。GA4 关闭增强型衡量、Google signals 和广告个性化，页面和来源 URL 去掉 query/hash。Clarity 使用严格文本屏蔽，HTML 明确屏蔽照片/生成器和输入框；带 query 的访问不加载 Clarity。不要移除遮罩或新增传送文件名、照片、邮箱、prompt 的事件。

修改 ID 后执行 npm run check，再按 DEPLOYMENT.md 发布。脚本存在或本地检查通过不等于平台收到数据，发布后检查 GA4 实时报告及 Clarity 数据接收状态。

## 产品规格与业务规则

本节是页面与下一轮支付实现共用的规则。公开页面采用正式产品文案；当前源代码仍是静态前端，套餐详情不是付款成功，文案提交不表示账号、支付、积分账本或 AI 服务已接通。

- 单张照片，最大 8MB；格式 Auto、16:9、1:1、9:16。480P / 720P Standard / 1080P Pro 分别显示 50 / 100 / 200 积分估算。
- 月付 Starter $19 / 400 credits，Creator $39 / 900 credits，Studio $79 / 2,000 credits。每月续费；取消停止后续续费。
- 一次性 100 credits / $9.90 / 30 天，200 credits / $14.90 / 30 天，500 credits / $29.90 / 90 天。有效期从积分发放起算。没有年付及 1,500 credits 套餐。
- 选图、看示例不扣生成积分。付款成功、积分到账、任务提交和生成完成是不同状态。确认失败且无交付的任务退回所扣积分；现金退款按退款政策审核。
- 核心生成入口去定价页；套餐选择显示该套餐明细和条款，不模拟扣款或到账。下一轮 Waffo 需实现订单核验、幂等积分发放、余额与权限后再替换支付入口。
- 不承诺固定完成时间、完美相似度、自动人工审核、无限存储或未经授权的商业使用权。模拟视频结果必须与真实生成区分。
- 隐私说明保留真实 GA4 / Clarity / Cloudflare 处理，按条件描述用户主动提供的信息，不虚构账号数据库、支付服务商或照片的服务器保留期限。接入支付或生成后必须更新实际处理方和上传流程。
- 退款条款不把使用积分自动当作放弃法定撤回权，参考欧盟官方消费者说明：https://europa.eu/youreurope/citizens/consumers/shopping/returns/index_en.htm 。上线 checkout 时按适用要求实现实际确认流程。

运行 npm run check 验证页面、统计保护、FAQ/结构化数据、套餐数字、资源和锚点。
