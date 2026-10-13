# Generation Lab

在项目根目录执行：

```powershell
npm.cmd ci
npm.cmd run generation:prepare-reference
npm.cmd run dev:generation
```

然后打开 `http://127.0.0.1:3010/generation-lab`。裁片脚本会用 `ffmpeg` 和 `ffprobe` 实测并保存 5 秒参考片及 SHA-256；如果它们不在 PATH，可在 PowerShell 先设置 `FFMPEG_PATH` 和 `FFPROBE_PATH` 为对应 exe 的完整路径。

`.env.generation` 默认包含空的 `APIMART_API_KEY`、`GENERATION_SUBMIT=false` 和 `GENERATION_INPUT_BASE=`。照片只写入被 Git 忽略的 `.local/generation`。没有受控 HTTPS 输入入口、server key 和显式提交开关时，页面只显示准确的 dry-run payload，不会发送照片。

provider 无法访问 localhost。`GENERATION_INPUT_BASE` 只属于 legacy local lab；正式页面使用 Worker `SITE_ORIGIN` 下的短期签名 URL。这个 legacy lab 不接正式 provider 流程，legacy dry-run 结果不代表新的 Fast provider paid E2E。

直接使用蓝底证件照可能保留蓝底、缺少上半身和身体动作；照片身份与参考视频动作不是同构图场景。要复刻宴会厅构图，后续需要先制作符合参考首帧的角色场景图，不能把一次 motion-control 调用承诺为完整复刻。

历史 5 秒样片记录：Task ID `task_01M4SWM9JZ2D4T6RR9X84RHBPF`，5.000 秒、784×1152、30fps、H.264 + AAC，消耗 5.144 credits。它只作为历史 provider 证据，不代表本轮 paid E2E。当前蓝底正面照会导致竖屏、blue-to-hall transition 和主体偏出画面；要复刻宴会厅，应先制作 16:9 同构图角色场景图，再用 reference 驱动。


## 正式 Worker provider 流程

正式页面只在 `/api/session` 返回 `generationReady: true` 时上传照片。照片通过 `POST /api/generation/uploads` 写入私有 R2，随后 `POST /api/jobs` 使用固定 `templateId=burning-bridges-template-15s`、`720`、`16:9` 和一次性 request key。页面保存草稿、photoAssetId、request key、job ID 和阶段；刷新后先读取 `/api/jobs`，对未完成 provider job 每 5 秒继续查询，最长 30 分钟。unknown 会保留任务并要求后台核对，不会生成新任务。provider 阶段包含 image preparation、video generation、audio postprocess 和 unknown；unknown 只提示后台核对，不自动重新付费提交。

默认候选是 Seedance 2.0 Fast 720p/15 秒。APIMart 单次 provider 估价上限为 50 credits；当前产品 720p 仍按网站 100 积分契约，二者不是同一计价单位。输出必须通过尺寸、时长和音轨校验，原声是复用参考片音轨，不保证逐字嘴型同步，也不承诺 100% 身份一致。

真实 provider 需要服务端 `APIMART_API_KEY`、`GENERATION_SIGNING_SECRET`、HTTPS `SITE_ORIGIN`、R2 输入/输出绑定和 Queue。当前生产 `GENERATION_MODE=provider`；Google 登录、production payment、R2、Queue 和 D1 provider schema 已配置，`generationReady=true`。`wrangler.generation.jsonc` 只是本地候选配置，不能替代正式生产配置。

`/generation-lab` 是历史 5 秒 Kling motion-control dry-run 实验入口。服务端默认拒绝 legacy submit；即使本地专项测试打开显式 legacy 开关，也不代表正式页面或生产 provider。正式页面使用新的 Fast 两阶段流程。

生产 binding 和 secrets 已由主线程配置；值不写入仓库。正式 paid E2E 仍需真人充值到账与 provider 结果复核。

本地候选 Worker 预览使用 http://127.0.0.1:18087，避免与其他项目的 8787 进程混用；这只是本地地址。



### 本地候选 Worker

在项目根目录按顺序执行：

```powershell
npm.cmd ci
npm.cmd run build
npx wrangler d1 migrations apply DB --local --config wrangler.generation.jsonc
npx wrangler dev --config wrangler.generation.jsonc --local --port 18087
```

本地候选成功标志是本地 Worker 在 `http://127.0.0.1:18087` 启动，`/api/session` 返回 `generationMode: "mock"` 且 `generationReady: false`；不会向 APIMart 发请求，也不会产生外部付费。以上命令只操作本地候选配置，不执行远程 migration 或部署。当前 provider key 的 `/v1/models` advertised model 为 `seedream-4-5`，代码按该实际 model 名发送；官方静态 Seedream 4.5 文档示例写作 `seedream-4.5`，两者是 provider metadata alias 差异，不能用文档样例盲目付费试错。视频使用 `seedance-2.0-fast`。

生产正式流程不要求用户填写 `GENERATION_INPUT_BASE`；provider 输入使用 Worker `SITE_ORIGIN` 下的短期签名素材 URL。`GENERATION_INPUT_BASE` 仅属于 legacy local lab。
