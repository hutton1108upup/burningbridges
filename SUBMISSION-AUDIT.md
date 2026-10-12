# GitHub 提交范围自查

目标仓库：`hutton1108upup/burningbridges`。包含公开前端及本项目的 Worker 支付/账号/积分后台源码，不包含原站私有后台或任何商户密钥。

## 适合提交

- `public/` 内的可编辑页面、交互代码、样式、字体、图标、海报、三段公开视频、sitemap、robots 与 404 页。
- `site.config.json`、`wrangler.jsonc`、`package.json`、`package-lock.json`：可复现的检查、构建和部署配置；不包含凭据。
- `scripts/server.mjs`、`scripts/check.mjs`、`scripts/build.mjs`、`scripts/audit-staged.mjs`：维护与自查脚本。
- `src/`、`migrations/`、`tests/`、`docs/`、`scripts/dev-commerce.mjs`、`scripts/sqlite-db.mjs`：后台实现、D1 表结构、支付/权限测试、运行说明及本地数据库适配器。
- `.github/workflows/check.yml`：在 GitHub 自动运行检查、构建与部署打包模拟，不进行生产部署。
- `.gitignore`、`.gitattributes`、项目说明和验收记录。

公开图片、字体和视频保留在仓库，是复刻页面离线可用的必要素材；没有重复提交构建副本。

## 只留本地

| 文件类别 | 原因 |
| --- | --- |
| `reference/` | 原始抓取 HTML、原站配置和浏览器截图，仅用于研究对照 |
| `.local/` | 发布截图、Waffo 操作记录、测试账号凭据、SQLite 数据库与操作脚本 |
| `dist/` | 根据源码生成的部署产物，避免重复和陈旧文件 |
| `node_modules/`、`.wrangler/` | 依赖、缓存与本地运行状态 |
| `.env*`、`.dev.vars*`、凭据和私钥 | 不得进入公开仓库或静态资源 |
| `public/site-data.json`、`public/reference-assets.json` | 原始研究数据，网页运行已改为精简的 `media.json` |
| `scripts/capture.py`、`scripts/prepare.py`、`scripts/configure-site.mjs` | 一次性制作工具；重新运行会覆盖编辑结果，不作为日常发布入口 |

上述类别由 `.gitignore` 排除。构建脚本也排除两个原始研究 JSON，避免它们从本地进入线上静态资源。

## 发布前检查

1. 执行 `npm.cmd ci`，确保依赖与锁文件一致。
2. 执行 `npm.cmd run check`，检查页面、素材、内部链接和新域名 canonical。
3. 执行 `npm.cmd run deploy:dry-run`，检查真实 Cloudflare 静态产物；此命令不部署。
4. 只暂存本文件所列的文件，执行 `npm.cmd run audit:staged`。检查实际暂存内容是否包含令牌、私钥、JWT 或个人电脑路径；输出不包含命中的秘密内容。
5. 执行 `git diff --cached --check`，通过后提交并推送。

模式扫描只能识别已定义的凭据形式，配合人工检查使用，不能代替账号与资源核对。
