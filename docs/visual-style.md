# 网站视觉与视频详情页规范

适用范围：全站公开页面，包括首页、Examples、视频详情、价格、指南、博客、政策和 404。新增视频详情页统一遵循下述结构；指南和政策页保留适合阅读的文章布局。

本规范记录用户已确认并于 2026-10-18 发布的方案，基准版本为 `1654efa74518e045a9ab871ae6f99d1f0f7b90f6`（PR #34）。后续页面采用同一套设计，不需要重新选择视觉方向。新的重要设计方向需用户确认后再更新规范。

2026-10-19 补充：用户确认以 Smalltown Boy 的手机短视频 App Hero 为视频页面标准。单视频页面使用共用手机播放器；双视频页面按下述双手机规则保留对照。文章、目录、价格和政策页面保留各自结构。发布状态需按准确版本单独验证，文档与本地预览不代表已经上线。

## 1. 配色与字体

默认是中性炭黑底、深灰卡片、柔白文字，鲜橙用于操作和强调。参考站只提供橙色灵感，不作为整套布局或浅色主题的来源。

| 用途 | 深色默认值 | 复用变量 |
| --- | --- | --- |
| 页面背景 | `#121212` | `--site-paper` |
| 卡片、独立操作区 | `#1D1D1F` | `--site-card` |
| 内嵌输入底色 | `#18181A` | `--site-tint` |
| 主文字 | `#F5F5F7` | `--site-ink` |
| 辅助文字 | `#AAAAB1` | `--site-muted` |
| 分隔线、卡片边框 | `#363638` | `--site-line` |
| 主按钮、选中状态、标题重点 | `#F47A1F` | `--brand-orange`、深色下的 `--site-link` |
| 悬停、橙色细节 | `#FF9A3C` | `--brand-bright` |
| 橙色按钮上的文字 | `#17110B` | 已有按钮规则 |
| 上传区虚线 | `#67676E` | `--site-upload-line` |

实现以 [site-theme.css](../public/site-theme.css) 为准。新样式使用共享变量，不在页面内重写整套色板。旧页的 `--muted` 有文字色和背景色两种历史用法，新代码明确使用 `--site-muted` 或 `--site-tint`。

橙色保持局部使用：主按钮、链接或标题重点、选中状态、聚焦提示。不把整个 Hero 染橙，不叠加橙棕色光晕，不使用复古棕底、奶白页面或独立的红/绿/紫主题。需要状态提示时保留清晰的文字、图标和现有错误样式。

字体复用本地 Onest（`SiteOnest` / `TrendOnest`），通过现有 CSS 加载，不新增外部字体请求。标题、正文、辅助信息沿用共享层级，不把整段标题或正文改成全大写。Hero 标题使用已有响应式规则，桌面上限约 54px，手机约 30–34px；具体取值以最终级联规则为准。

保留已有主题切换：新页默认在 `<html>` 上设置 `site-refresh dark`，浅色模式由同一份主题 CSS 提供，不另写页面色板。

## 2. 样式与脚本的复用方式

视频详情页的基础接入顺序：

```html
<html lang="en" class="site-refresh dark">
<!-- head：基础样式、页面必要补充样式、导航样式先加载 -->
<link rel="stylesheet" href="/trend-samples.css">
<link rel="stylesheet" href="/site-theme.css">
<!-- body 的其他场景类可以保留 -->
<body class="site-refresh video-detail">
```

以上是接入示意，不是完整可发布页面。必须保留页面所需的 metadata、导航、脚本和正文。`site-theme.css` 应是最后加载的样式表，确保公共配色不被旧页样式覆盖。

| 文件 | 责任 |
| --- | --- |
| [site-theme.css](../public/site-theme.css) | 全站配色、字体、按钮、公共 Hero、独立操作区与响应式协调 |
| [social-video-hero.css](../public/social-video-hero.css) / [social-video-hero.js](../public/social-video-hero.js) | 单视频 Hero 的手机外观、App 信息层、响应式尺寸与本地点赞、声音、全屏控件；仅在显式接入的页面生效 |
| [dual-video-hero.css](../public/dual-video-hero.css) | 双视频 Hero 的并排手机、对照标签、移动端横向滑动与场景差异；复用共用 App 样式和按播放器分别初始化的交互 |
| [trend-samples.css](../public/trend-samples.css) | 已推广到详情页的公共排版、视频卡片、照片区、步骤、FAQ 与页脚；名称不代表临时文件 |
| [trend-samples.js](../public/trend-samples.js) | 使用 `data-photo-workspace` 的本地照片预览控件 |
| [video-navigation.js](../public/video-navigation.js) / [video-navigation.css](../public/video-navigation.css) | 公共分类导航和 Examples 筛选 |
| [local.js](../public/local.js) / [commerce.js](../public/commerce.js) | 既有导航、账号和真实生成相关流程；按现有入口接入 |
| 场景专属 CSS / JS | 角色、配对、画幅、参考切换等场景差异，不重建全站视觉系统 |

不要在每个新页面复制一套按钮、字体、背景和响应式规则。需要公共规则时改公共样式，并检查首页、目录、价格和其他详情页是否受影响。

## 3. 视频详情页的固定结构

桌面顺序：公共导航 → 面包屑 → 双栏 Hero → 独立照片操作区 → 该页面自己的内容、示例、说明、FAQ 与页脚。

Hero 左栏包含分类提示、唯一 H1、说明、必要规格和主操作入口；右栏展示参考视频。主操作入口优先滚动到本页操作区，已有其他有效入口继续保留。不要把照片输入、角色选择、生成设置或购买操作面板塞进 Hero。

结构示意：

```html
<section class="hero unified-hero" aria-labelledby="page-title">
  <div class="hero-copy">
    <!-- 本页标题、文案、规格和指向下方操作区的入口 -->
  </div>
  <div class="hero-media">
    <!-- 有来源说明的参考视频，保留原始横竖比例 -->
  </div>
</section>
<section class="site-operation" id="photo-workspace">
  <!-- 复用匹配场景的完整照片/生成组件，包括其状态和错误提示 -->
</section>
<!-- 保留该页面其余内容 -->
```

布局规则：

- 复用 `.unified-hero`、`.site-operation` 及现有子布局。内容最大宽度为 1180px；窄屏 Hero 和操作区左右通常各留 20px。不要嵌套多个带宽度和左右留白的容器，把内容重复挤窄。
- 桌面 Hero 约 `1.05fr / .95fr` 双栏；700px 以下按文案、参考视频、独立操作区顺序显示。不要让视频跑到文案之前，也不要用固定高度把文案裁掉。
- 视频使用播放器原生 controls，保留横竖比例，采用 `object-fit: contain`。不拉伸、不裁掉关键动作；保留出处、字幕说明和原有参考切换。首屏保留合适的 poster，避免为展示而同时下载或播放全部视频。
- 对照型参考可以保留两条竖版视频；双人表演可以保留多条横版参考。统一的是布局和样式，不是视频数量或比例。
- 操作区使用深灰卡片和细边框。已有 `.workspace-grid`、`.operation-grid` 可在桌面分为照片控件和说明两栏，手机纵向堆叠。双角色照片可以保留各自独立选择器，在窄屏按现有断点堆叠。
- 用户操作需要清晰的标签、键盘焦点、选择/替换/移除入口、预览和状态/错误反馈。不要通过隐藏溢出来掩盖挤压问题；要检查文案、菜单、网格和输入区实际边界。
- 页面下半部保留各场景的差异化正文、示例和 FAQ，不为统一视觉而删除内容或把所有详情页改成同一套文案。

### 单视频 Hero 的手机 App 样式

- 已确认参考：[Smalltown Boy](../public/examples/ai-smalltown-boy/index.html)。其他单视频页面共用 `social-video-hero.css` 和 `social-video-hero.js`，不再逐页复制手机样式与交互脚本。Smalltown 专属 CSS 只保留该场景下半页差异。
- 页面在 `body` 上接入 `.social-video-page`，Hero 接入 `.social-hero`，左右两栏分别接入 `.social-hero-copy` 和 `.social-hero-media`。共享样式在 `site-theme.css` 前加载，并通过显式作用域协调既有规则。
- 视频展示容器为 `9:16`，保留原视频、poster、原生 controls、ID 和 `data-*` 绑定。素材本身的横竖比例不改，使用 `object-fit: contain` 和当前 poster 的柔化背景填充；横版参考仍须完整显示，真实生成的输出规格不随容器改变。
- 手机包含圆角边框、顶部镜头、底部横条；内部包含频道提示、来源与话题、右侧本地点赞、声音和全屏按钮。不得伪造播放量、点赞数、评论数或关注关系。原素材署名、能力边界和相关链接保留。
- 电脑端视频随可用屏高调整，协调左侧标题、说明、规格和操作间距。在 `1280×800`、`1366×768`、`1440×900` 下，首屏底部至少露出下一操作区的部分内容。不同页面可以通过 `--social-hero-chrome` 为面包屑、署名和切换控件预留空间；不裁切或隐藏正文来满足高度。
- 手机端仍按文案、播放器、操作区排列。App 控件不得遮住原生播放控制，支持键盘聚焦。声音按钮与原生音量保持同步。
- Toc Toc 保留两条参考的切换按钮、片名、状态播报及 poster 同步。Bulin 47、Cheba Man、Alors on Danse 按下述双视频规则展示。当前首页只有一条 Hero 参考视频，因此接入单视频布局；以后如果改成多视频布局，应重新评估。
- 本地浏览器验收不提交生成任务或支付。在项目根目录 PowerShell 中先启动预览：

  ```powershell
  $env:PORT='4196'
  npm.cmd run dev
  ```

  看到 `Local commerce website: http://localhost:4196` 后，另开项目根目录 PowerShell 执行：

  ```powershell
  python scripts/qa-social-heroes.py --base-url http://localhost:4196 --output "$env:TEMP/shared-social-hero-qa"
  ```

  最后显示 `PASS: single-video Heroes and dual-reference structure` 才算通过，截图与 `results.json` 保存在指定输出目录。

### 双视频 Hero 的手机 App 样式

- Bulin 47 与 Cheba Man 保留原片和 AI 版本的对照，分别标注 `Original`、`AI version`；Alors on Danse 保留两组演出参考，分别标注 `Duet reference 01`、`Duet reference 02`。不把第三方参考标成本站生成结果。
- 复用 `.social-video-page`、`.social-hero` 和共用播放器，另外接入 `.dual-social-page`、`.dual-social-hero` 与 `dual-video-hero.css`。仅通过这些显式类修改双视频布局，不影响其他单视频页面。
- 电脑宽屏使用左侧文案、右侧两部手机并排；中等屏宽先展示文案，再展示并排双手机。手机端使用局部横向滚动，显示第一张卡片和第二张卡片的一部分，带滑动提示、焦点和滚动条，不产生整页横向溢出。
- 两条视频的原素材、poster、原生 controls、署名和来源链接保持不变。竖屏容器内完整展示横版演出，不裁切关键角色、乐器或原片画面。
- 每部手机的点赞、声音、状态播报和全屏独立绑定。继续沿用原页面一次只播放一条的行为，避免两段音轨叠加。照片控件、双角色配对预览和页内锚点保留。
- 双视频验收在项目根目录运行：

  ```powershell
  python scripts/qa-dual-heroes.py --base-url http://localhost:4196 --output "$env:TEMP/dual-social-hero-qa"
  ```

  预览服务启动方式与上一节相同；最后显示 `PASS: dual-reference layout, independent controls, swipe and photo previews` 才算通过。

## 4. 参考实现与功能边界

| 页面 | 适合复用的部分 |
| --- | --- |
| [Bulin 47](../public/bulin-47-ai-video-maker/index.html) | 已确认的基本视觉、两条竖版参考、单张照片本地预览 |
| [Flying Entrance](../public/flying-entrance/index.html) | 单条竖版参考、人物和汽车两个独立照片选择器 |
| [Alors on Danse](../public/examples/alors-on-danse-ai-video-generator/index.html) | 两个角色、配对预览和横版表演参考 |
| [Gas Station Dance](../public/gas-station-dance-ai/index.html) | 单人/三人角色切换及对应照片槽 |
| [首页](../public/index.html) / [Drake 详情](../public/burning-bridges-video-ai/index.html) | 已有账号、积分与生成组件接入 |

新增页面优先复制最接近的现有结构，再替换页面内容、SEO、素材及唯一 ID。复用照片组件时连同其 `data-*`、标签关联、状态节点和脚本一起保留；不要只复制一个看起来像上传框的外壳。保留既有输入数量、校验条件、画幅和角色行为。

本项目是视频生成产品，页面、内容与生成能力可以由不同 worktree 分工开发。`trend-samples.js` 的照片预览实现不能用于推断全站是否支持某个主题。遵循项目 `AGENTS.md` 的产品文案规则：不添加“generation is not included”“只支持 Burning Bridges 模板”“这里只是参考页”等限制；直接写照片要求、角色、场景与制作步骤。具体接口进度留在内部说明中核实，不补写未经验证的上线或效果保证。不要因文案或视觉调整改动登录、支付、积分、任务恢复或下载逻辑。

照片格式、尺寸、文件大小和数量以该组件的实际校验为准；不要把现有不同组件的 8MB / 10MB 限制统一写成同一个数。参考素材不能标成本站用户生成结果，保留原来源和必要能力说明。

## 5. 新增页面的执行步骤

1. 在项目根目录阅读本规范，选择上表中最接近的页面作为起点。在 `public/<新路径>/index.html` 创建页面；场景专属素材放 `public/assets/<场景>/`。
2. 保留公共导航和既有交互组件，接入共享 CSS 和匹配的脚本。替换标题、文案、参考素材、标签及唯一 ID；使用本页锚点把 Hero 主入口连到下方操作区。
3. 配置独立 title、description、canonical、OG 和所需结构化数据；FAQ 的可见答案与 schema 保持一致。公共页面保留有效索引信息，不因使用公共布局而一律 noindex。
4. 在 [site.config.json](../site.config.json) 注册 route 和资源，在 [sitemap.xml](../public/sitemap.xml) 加入正式 URL。属于 Examples 的视频项目同时添加到 [video-projects.json](../public/video-projects.json)，填写正确的分类、名称、描述、图片和路径。 每个项目必须提供带时区的 `publishedAt` 时间（如 `2026-10-21T21:06:59+08:00`）；Examples 卡片及其 ItemList 按该时间从新到旧排列，分类筛选保留此顺序。旧页面改文案、封面时不更新该值。历史项目以首次进入主分支的提交时间补齐，作为发布顺序依据，不代表精确的生产部署时间。
5. 在项目根目录 PowerShell 依次执行：

   ```powershell
   npm.cmd run sync:video-projects
   npm.cmd run check
   npm.cmd run build
   npm.cmd run dev
   ```

   `sync:video-projects` 依据目录 JSON 生成导航和 Examples 卡片，不要直接手改这些生成块。检查与构建成功后，开发服务应显示 `Local commerce website: http://localhost:3001`；打开该地址下的新页面查看。已有开发服务运行时直接刷新；端口设置见 [README](../README.md)。失败时先修复失败项，再继续下一步。
6. 按下方清单完成浏览器验收，交付本地预览。提交、推送、合并和部署遵循用户本次授权，不把本地验证称为上线。

## 6. 完成验收清单

- 320、390、768、1280px 四种宽度无整页横向溢出；文字、按钮、视频与照片区未被挤压或裁掉。
- 样式和字体加载完成后再测布局；远程页面不能在 CSS 尚未加载时直接记录结果。
- 默认配色正确，Hero 是深色开放背景；主题切换、焦点和选中状态可辨认。
- Hero 无照片输入，操作区在其下方；手机顺序为文案、参考视频、操作区，固定导航不遮挡标题和锚点目标。
- 菜单可打开、关闭和滚动；Examples 分类筛选、相关项目入口及本页锚点均正确。
- 参考视频可播放、暂停和按需开启声音；原有参考切换保留，素材来源可见。
- 照片选择、替换、移除、无效文件反馈正常；多角色相互独立，角色切换和配对预览未失效。涉及生成组件时检查草稿/任务状态，不为样式验收擅自消耗积分或付款。
- 原正文、链接、输入控件绑定、SEO、FAQ/schema、目录和 sitemap 已核对；保留有效的页面差异。
- `npm.cmd run check`、`npm.cmd run build` 通过，查看实际差异并保留代表性的电脑和手机截图。公共样式改动同时检查首页、Examples、价格及受影响的详情页。
- 若已获授权发布：部署合并后的准确版本，核对正式域名和平台地址的 `release.json`；复查线上页面、关键样式/脚本、链接和手机端。本地或 CI 通过不能代替线上验收。
