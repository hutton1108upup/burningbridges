# Cloudflare 发布

架构：Cloudflare Worker + D1 + Static Assets。Worker 名称 `burningbridges`，入口 `src/worker.mjs`，静态目录 `dist`，主域名 `burningbridgesaivideo.pro`。

目标账户已确认：`Duckweed1014@gmail.com's Account`。账户 ID 已写入 `wrangler.jsonc`，它是公开资源标识，不是登录凭据。GitHub 仓库为 `hutton1108upup/burningbridges`。

账号、Google 登录、Waffo production payment、积分账本和 generation provider 已按当前生产配置上线。真实 paid generation 本轮按用户要求跳过，不能把自动化 stub 或历史样片当作本轮 paid E2E 充值证明。详见 `docs/generation.md`。

## 本地检查

在项目文件夹的 PowerShell 终端依次运行：

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run deploy:dry-run
```

看到页面检查 `PASS` 和 Wrangler `--dry-run: exiting now` 后，说明本地构建与部署打包通过，尚未发布。

## 正式部署

1. 使用已确认的 `duckweed` profile；Wrangler 当前 CLI 不提供可用的 `whoami --profile` 校验，因此用 `npx.cmd wrangler auth list` 和 `npx.cmd wrangler deployments list --name burningbridges --profile duckweed` 核对登录会话、部署记录和 account ID。
2. 确认 `burningbridgesaivideo.pro` Zone 在上述账户下且为 `Active`，`wrangler.jsonc` 的 `account_id` 已固定。不要把 API Token 写进项目文件。
3. 已确认 production D1 的 `0003_provider_jobs.sql` 已应用；后续 migration 使用 `npx.cmd wrangler d1 migrations apply burningbridges-commerce-prod --remote --profile duckweed`，不要把 Test DB 命令当作正式上线步骤。Secret 只通过 Wrangler Secret 配置，不写入仓库。
4. 由主线程在账号、资源和变更确认后，使用 `npm.cmd run build` 与显式 `npx.cmd wrangler deploy --profile duckweed` 发布；不要使用默认账号，也不要把 `npm run deploy` 当作已确认的目标 profile。
5. 看到上传成功、版本 ID 和域名后，再检查 `/release.json` 的 `revision` 与本次 Git 提交一致；同时验证账号、Test checkout、签名到账和模拟任务，静态页面 HTTP 200 不能证明支付可用。

`release.json` 在构建时生成，不加入 Git。它用来区分本地构建、GitHub 提交和真正上线的版本。

GitHub Actions 自动验证，不自动部署。Cloudflare 如使用 Git 集成，构建命令填 `npm run build`，部署命令填 `npx wrangler deploy`，根目录为仓库根目录；连接时核对仓库所有者 `hutton1108upup`。

## www 和 HTTPS

1. 在 Cloudflare 的 `Workers & Pages → burningbridges → Settings → Domains & Routes` 确認根域名绑定。根域名由 Wrangler 的 Custom Domain 管理，不能只手动加 DNS 代替绑定。
2. 在域名的 `DNS → Records` 建立 `A www → 192.0.2.0`，代理开启，TTL 为 Auto。已有记录时先检查，不重复添加。
3. 在 `Rules → Redirect Rules` 配置 `www` 到根域名的 301 重定向，保留路径与查询参数。
4. 在 `SSL/TLS → Edge Certificates` 开启 `Always Use HTTPS`，检查根域名及 www 证书有效。
5. 依次检查以下地址，最终都应到达 `https://burningbridgesaivideo.pro/pricing?test=1`：

   ```powershell
   curl.exe -I "https://burningbridgesaivideo.pro/pricing?test=1"
   curl.exe -I "http://burningbridgesaivideo.pro/pricing?test=1"
   curl.exe -I "https://www.burningbridgesaivideo.pro/pricing?test=1"
   curl.exe -I "http://www.burningbridgesaivideo.pro/pricing?test=1"
   ```

HTTPS 主域名应返回 200，其他入口应返回重定向，路径和 `test=1` 不丢失。再验证 public DNS、有效 TLS、首页、价格页、博客、视频和 404。域名 DNS 或证书尚未生效时，不把部署日志当作上线成功。

## 本站 DNS 与签名配置

- 注册商：Spaceship，域名 `burningbridgesaivideo.pro`。
- Cloudflare 名称服务器：`hope.ns.cloudflare.com`、`joel.ns.cloudflare.com`。
- Spaceship 原有 DNSSEC 保护已通过预先配置 Cloudflare DS 的方式迁移，没有关闭保护。后续更换 DNS 提供商时，应重新核对签名密钥与 DS，不能只修改名称服务器。
- `www` 使用代理开启的 `A → 192.0.2.0`，由 `WWW to HTTPS apex` 规则执行 301；主域名绑定 `burningbridges` Worker。
- `Always Use HTTPS` 已启用；Universal SSL 负责根域名和 www 的边缘证书。

Wrangler 的本机 OAuth 使用已确认的 `duckweed` 账号配置。它是电脑上的登录会话，不随仓库上传。其他电脑先登录同一目标账户，再运行部署命令。

## Generation provider 发布记录

- 线上地址：`https://burningbridgesaivideo.pro`。
- 当前线上代码：`08cd68ebe54b08f71a44ef6dce8108be7b84fd01`。
- Cloudflare Version：`18282db9-139f-4cdc-9d76-b4bb8981044b`。
- 当前 readiness：`generationReady=true`；Google login、production payment、provider mode 已配置。
- R2：`GENERATION_INPUTS=burningbridges-generation-inputs`、`GENERATION_OUTPUTS=burningbridges-generation-outputs`。
- Queue：`GENERATION_QUEUE=burningbridges-generation`，consumer 单批次、最多 5 次重试；D1 `0003_provider_jobs.sql` 已应用。
- Required secrets：`APIMART_API_KEY`、`GENERATION_SIGNING_SECRET`；值不写入仓库。
- Provider 单 job guard 为 50 APIMart credits，网站 720p 继续使用 100 积分。

本轮已验证：55 个自动化测试、主页和 pricing browser stub checkout、build 和 provider HTTP stub chain。用户明确跳过本轮新的充值与真实 paid generation，因此不能声称本轮完成真人充值到账后的 APIMart E2E。
