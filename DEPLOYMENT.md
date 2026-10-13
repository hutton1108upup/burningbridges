# Cloudflare 发布

架构：Cloudflare Worker + D1 + Static Assets。Worker 名称 `burningbridges`，入口 `src/worker.mjs`，静态目录 `dist`，主域名 `burningbridgesaivideo.pro`。

目标账户已确认：`Duckweed1014@gmail.com's Account`。账户 ID 已写入 `wrangler.jsonc`，它是公开资源标识，不是登录凭据。GitHub 仓库为 `hutton1108upup/burningbridges`。

账号、Google 登录、Waffo production payment 和积分账本按当前生产配置运行；generation provider 仍保持 mock，不能把 mock 验收当作真实视频开通。真实 generation 需要单独完成 R2、Queue、APIMart Secret 和真人充值到账验证。详见 `docs/generation.md`。

## 本地检查

在项目文件夹的 PowerShell 终端依次运行：

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run deploy:dry-run
```

看到页面检查 `PASS` 和 Wrangler `--dry-run: exiting now` 后，说明本地构建与部署打包通过，尚未发布。

## 正式部署

1. 用 `npx.cmd wrangler whoami --profile duckweed` 检查已登录账户。仅使用得到确认的目标账户，不能使用另一项目或另一账号的令牌。
2. 确认 `burningbridgesaivideo.pro` Zone 在上述账户下且为 `Active`，`wrangler.jsonc` 的 `account_id` 已固定。不要把 API Token 写进项目文件。
3. 首次接入时，在独立的 `burningbridges-commerce-test` 数据库执行 `npx.cmd wrangler d1 migrations apply burningbridges-commerce-test --remote --profile duckweed`。将专用 Test 私钥通过 Wrangler Secret 标准输入配置，不提交私钥。
4. 本地提交并推送修改后，运行 `npm.cmd run deploy`。
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

## Generation provider 上线前置

当前生产 `GENERATION_MODE=mock`，Google 登录、production payment 和双 D1 保持不变。provider 配置只在以下条件全部满足后由用户确认开启：

- R2：`GENERATION_INPUTS`=`burningbridges-generation-inputs`，`GENERATION_OUTPUTS`=`burningbridges-generation-outputs`；
- Queue：`GENERATION_QUEUE`=`burningbridges-generation`，consumer `max_batch_size=1`、`max_retries=5`、每阶段可延迟 30 秒；
- Secret：`APIMART_API_KEY`、`GENERATION_SIGNING_SECRET`；
- 网站 HTTPS `SITE_ORIGIN` 和 provider 可访问的签名素材路径；
- D1 migration `0003_provider_jobs.sql`，不会修改 Google auth、payment 或积分表；
- provider 单 job guard 为 50 APIMart credits，网站 720p 继续扣 100 积分。

R2 尚未开通，当前专用 APIMart key 权限不足，不能宣称真实 provider 已上线。正式操作前先在项目根目录执行 `npm.cmd run build`，再用已确认的 `duckweed` profile 做 `npx.cmd wrangler deploy --dry-run --profile duckweed`；不要使用默认 Cloudflare profile。真实开通还必须由用户确认账号、R2/Queue 资源和真人充值到账。


Provider 开启前，确认 `GENERATION_INPUTS`、`GENERATION_OUTPUTS`、`GENERATION_QUEUE` 已由管理员创建并绑定，Worker Secret 名称为 `APIMART_API_KEY` 和 `GENERATION_SIGNING_SECRET`。用户页面只有 `/api/session` readiness 完整时才会上传照片和扣 100 网站积分。
