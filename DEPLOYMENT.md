# Cloudflare 发布

架构：Cloudflare Workers Static Assets。Worker 名称 `burningbridges`，静态目录 `dist`，主域名 `burningbridgesaivideo.pro`。

目标账户已确认：`Duckweed1014@gmail.com's Account`。账户 ID 已写入 `wrangler.jsonc`，它是公开资源标识，不是登录凭据。GitHub 仓库为 `hutton1108upup/burningbridges`。

登录、支付和真实 AI 生成仍未接入；部署的是当前静态前端版本。

## 本地检查

在项目文件夹的 PowerShell 终端依次运行：

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run deploy:dry-run
```

看到页面检查 `PASS` 和 Wrangler `--dry-run: exiting now` 后，说明本地构建与部署打包通过，尚未发布。

## 正式部署

1. 用 `npx.cmd wrangler whoami` 检查已登录账户。仅使用得到确认的目标账户，不能使用另一项目或另一账号的令牌。
2. 确认 `burningbridgesaivideo.pro` Zone 在上述账户下且为 `Active`，`wrangler.jsonc` 的 `account_id` 已固定。不要把 API Token 写进项目文件。
3. 本地提交并推送修改后，运行 `npm.cmd run deploy`。
4. 看到上传成功、版本 ID 和域名后，再检查 `/release.json` 的 `revision` 与本次 Git 提交一致。

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
