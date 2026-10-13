# Waffo 支付与模拟生成

## 2026-10-13 生产支付准备

- 已在 Waffo 生产模式核对本店铺“已准备好接收正式付款”、客服邮箱和域名已验证；六档产品销售中，价格和产品 ID 与现有套餐映射一致。
- 独立正式账本：`burningbridges-commerce-prod`，绑定 `PRODUCTION_DB`；不迁移 Test 用户、订单或积分。
- 专用生产回调：`https://burningbridgesaivideo.pro/api/waffo/webhook/production`。只接受 SDK 生产签名校验通过、店铺及订单匹配的生产事件；写入正式账本，拒绝 Test 事件。未匹配到本站创建的订单不会发放积分。
- 现有 Test 回调、Test checkout 与模拟视频流程继续使用 Test 数据库。本次准备不代表真实扣款或生产订单到账已经验证。
- 已注册本店铺生产 Raw Webhook，监听全部 14 类官方事件。验签使用 SDK 内置生产公钥；服务器拒绝未签名请求。
- 生产 API 私钥仍须新建本项目专用密钥后保存在本地私有配置和 Worker Secret `WAFFO_PRODUCTION_PRIVATE_KEY`；不能复用其他项目的商户密钥，也不能覆盖现有 Test 私钥。代码按支付环境选择不同私钥，缺少生产私钥时保持关闭。
- 实际启用生产 checkout 前，还需真实生成服务及输入、输出审核；当前保持 `PAYMENT_MODE=test`、`GENERATION_MODE=mock`。正式账本与回调准备完成不等于开启正式收款。

## 配置范围

- GitHub：`hutton1108upup/burningbridges`，分支 `main`。
- Cloudflare：已确认 duckweed1014 账号，Worker `burningbridges`，域名 `burningbridgesaivideo.pro`。
- Waffo 商户：`MER_0Ca1DBngIQV3s35pRE1wcg`；独立 Test 店铺 `STO_690LIDfbX77uj1xL7uZnxk`。
- 专用 Test API Key：`Burning Bridges Test 2026-10-12`，关闭再次下载；私钥仅 `.dev.vars` 与 Worker Secret `WAFFO_PRIVATE_KEY`。Waffo 密钥是商户级，不支持按店铺限权；应用固定店铺，不复用其他项目密钥。
- D1：`burningbridges-commerce-test`，绑定 `DB`；正式付款启用前须另建正式数据库和正式密钥，不把 Test 积分迁移为付费积分。
- 当前 `PAYMENT_MODE=test`、`GENERATION_MODE=mock`。只允许测试积分驱动模拟任务；正式 checkout 与正式积分消耗在真实 provider 接入前保持关闭。

## 用户流程

1. 首页选图，IndexedDB 保存照片、格式及分辨率。未登录或积分不足时点生成入口进入 `/pricing`。
2. 选择六档之一，创建账号或登录；注册时保存一次性恢复码。密码通过 scrypt 加盐，数据库只存密码及恢复码的散列。会话保存在 Secure / HttpOnly / SameSite cookie。
3. 服务器从固定套餐目录创建 Waffo checkout，绑定本站账号、订单及草稿；金额不接受客户端输入。
4. Waffo 完成付款后点 Done 回到本站；返回页查询账号订单，不信任 URL 的 success 状态。
5. 签名 webhook 核验对应环境、店铺、订单、账号、产品 metadata、币种、listPrice.subtotal 和付款状态。月付把成功付款与实际账期按订单+periodNumber 汇合后发积分，处理乱序与重复投递。
6. 积分到账后返回照片，点 Generate Video。服务器以同一原子事务建立任务和按到期顺序扣积分。余额不足会回滚，重复请求键不会重复收费。
7. 模拟任务完成后显示标注的参考视频和受保护下载。刷新可恢复任务；切换账号不能查看别人的订单或任务。模拟流程未调用 AI，也未上传照片。
8. 订阅/账单通过 Waffo Customer Portal 管理。完整退款撤销对应未用积分；部分退款按比例向上取整调整，已消费部分不通过失败退积分重新铸造。

## 部署步骤

在本项目 PowerShell 终端按顺序执行：

```powershell
npm.cmd ci
npm.cmd run check
npx.cmd wrangler d1 migrations apply burningbridges-commerce-test --remote
npm.cmd run deploy
```

私钥通过 Wrangler `secret put WAFFO_PRIVATE_KEY` 的标准输入上传；不要写进命令参数、Git、日志、截图或公开资源。`wrangler.jsonc` 仅含公开资源标识和开关。本站 webhook 为 `https://burningbridgesaivideo.pro/api/waffo/webhook`，仅注册 Test 事件。

## 验收与证据

自动化测试验证：签名及时间窗口、店铺/环境/金额/身份匹配、重复发放、账期乱序、积分有效期、原子余额扣减、请求幂等、失败退还、现金退款调整、登录恢复和跨站请求拦截。`npm run check` 同时验证原有 11 个页面与统计保护。

本地合成事件不等于真实 Waffo 测试订单。2026-10-12 已在本项目域名观察验证：

- 一次性 $9.90 sandbox 拒付，余额保持 0；重新从定价页创建 checkout 后，官方成功测试卡付款成功，签名 `order.completed` 发放 100 Test 积分。
- Done 返回付款状态页显示到账；付款前 IndexedDB 照片及 720P / Auto 设置恢复；用户主动生成后余额 100 → 0，模拟任务成功。
- 浏览器实际下载 MP4，6,005,473 字节；受保护下载 HTTP 200，未登录请求 HTTP 401。
- Starter $19 sandbox 月付成功，签名 `subscription.payment_succeeded` 与 `subscription.activated` 均已入库，发放 400 Test 积分。
- 修复固定导航遮住账号栏的问题；Manage billing 已能打开该账号、该店铺的 Waffo Customer Portal。
- 付款后更换照片并选择 480P / 9:16，再次提交模拟任务，余额 400 → 350；手机布局无横向溢出。
- 19 项自动化测试及原有页面/统计/文案检查全部通过。生产收款仍需 Waffo 商户审核和真实生成服务；此记录不声称已验证真实扣款、真实 AI 或下月真实续费。

拒付后，Waffo 的替换 checkout 可能提示已过期；回到本站定价页重新选择套餐会创建新会话，不复用失效链接。所有测试截图、账号凭据与数据库探针输出只在 `.local/`，不提交。

## 后续接入真实视频 API

保留订单核验及积分账本，新增经过认证的照片上传、私有对象存储、provider job 与可靠队列、回调或轮询、授权下载和失败确认。只有完整真实生成流程通过后，才启用 `GENERATION_MODE=provider` 的实现与 Production 收款。当前 Worker 没有 provider 分支，修改开关本身不会接通 AI。

## 官方依据

- [API Key 与店铺权限](https://docs.waffo.ai/api-reference/authentication)
- [Checkout session](https://docs.waffo.ai/api-reference/endpoints/orders/create-checkout-session)
- [签名及事件字段](https://docs.waffo.ai/api-reference/webhooks)
- [Test checkout 与测试卡](https://docs.waffo.ai/merchant-guide/checkout)
