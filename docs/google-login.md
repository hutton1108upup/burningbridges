# Google 登录：模板能力的局部适配

本站借用 mkfast 的 Better Auth + Google + Drizzle/D1 方案，不迁移 React/TanStack 页面或原支付表。

## 已实现与边界

- 登录框优先显示 Continue with Google；未配置时禁用并解释原因，邮箱密码仍可使用。
- Better Auth 负责 Google 授权、state、令牌核验及回调；本站只允许 Google callback 对外访问。
- Google 认证使用 google_auth_* 独立表，通过 google_identities 映射原 users.id；原 orders、lots、jobs 继续使用原用户 ID。
- 旧邮箱账号不会自动合并。先用原密码登录，打开 Account → Link Google，选择同邮箱 Google 账号。原订单和积分不迁移。
- Google 专用账号通过 Google 登录，没有预设可用密码或恢复码。原邮箱账号的密码/恢复码流程保留。
- 登录尝试有效期十分钟，一次性消费；拒绝过期、重复、未验证邮箱、旧认证会话和绑定期间变更的本站会话。
- 不申请 Gmail、Drive 等权限；仅身份认证。认证凭据留在服务端，不发送到统计。
- 本地自动化模拟 Google 响应。真实 Google Cloud 应用、真实账号授权和生产部署仍需分别验证。

## 本地真实验证

本次本站专用 Google Cloud 项目已核对：账号 `duckweed1014@gmail.com`，组织 `duckweed1014-org`，项目 `Burning Bridges`，Project ID `burning-bridges-duckweed1014`。应用名称为 `Burning Bridges AI Video`，支持和联系邮箱为该邮箱，受众为外部、发布状态为正式版。客户端 `Burning Bridges Web Login` 已配置上述三条回调。本地已用该邮箱完成真实登录、刷新保持和退出；正式网站验收仍需在部署后完成。

1. 用户先确认 Google Cloud 账号与项目。进入 Google Cloud Console → Google Auth Platform，配置应用信息、受众及 Web application 客户端；如在 Testing 状态，把验证用账号列为测试用户。
2. 为 Web 客户端添加回调：
   - http://localhost:3000/api/oauth/callback/google
   - http://127.0.0.1:3000/api/oauth/callback/google
   - https://burningbridgesaivideo.pro/api/oauth/callback/google （准备部署时再配置）
3. 在本站根目录创建 .env.google.local，按下面填入本站专用值。此文件被 Git 忽略，禁止提交。不要复制其他项目的 Secret。

```dotenv
GOOGLE_LOGIN_ENABLED=true
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET
BETTER_AUTH_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
PORT=3000
```

4. 在本站根目录 PowerShell 生成 BETTER_AUTH_SECRET（仅本地查看，勿发到聊天）：

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

5. 停止本项目旧预览进程，使用新配置启动：

```powershell
node --env-file=.env.google.local scripts/dev-commerce.mjs
```

6. 打开 http://localhost:3000/，点击 Sign in → Continue with Google，完成授权。看到 Account、Google 登录成功提示，并能刷新后仍保持登录，才算真实登录成功。
7. 旧邮箱账号：先原密码登录 → Account → Link Google → 同邮箱 Google 账号；退出再 Google 登录，确认 user ID、订单和积分一致。错误账号、取消授权、过期尝试也应测试。
8. 未配置或 Secret 错误时停在登录验证；不要因此发布或打开真实收款。

## 生产配置（需确认账号与资源后执行）

- Worker: burningbridges；正式域名: https://burningbridgesaivideo.pro。
- 已核对线上主分支使用 `burningbridges-commerce-prod` 作为主数据库；`burningbridges-commerce-test` 保留独立 Test 账本。Google 表迁移应用到正式数据库，不改变支付环境或账本隔离。
- GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、BETTER_AUTH_SECRET 已通过本站 Worker Secret 设置；GOOGLE_LOGIN_ENABLED 为 true。缺少任何必要配置时服务端仍拒绝 Google 登录。
- 发布前先备份 D1，再应用 migrations/0002_google_auth.sql。此迁移只新增 Google 表，不改已有支付表。
- 生产回调固定为 https://burningbridgesaivideo.pro/api/oauth/callback/google。
- 主站与回调必须使用同一个 origin；登录返回仅允许本站首页、生成器或 pricing。
- 部署成功后必须以真实 Google 账号复测；自动化测试通过不等于上线登录成功。

## 验证命令

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run deploy:dry-run
```

最后一条只验证 Worker 打包，不会部署。
