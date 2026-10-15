# 首页视频素材与文案更新

日期：2026-10-15。范围：本地修改与验证；不提交、不推送、不部署。

## 来源和使用依据

本次会话中，用户明确确认拥有参考站三条视频的使用授权，并授权下载用于本项目。素材来源为 https://burningbridgesai.com/ 。该确认是本次导入依据，不将“公开可访问”当作转载授权。保留原文件内容，不去水印、不伪装为本站生成结果。三条素材均在页面标为 Trend inspiration。

以下元数据由 Mediabunny 读取本地 MP4 得到；SHA-256 根据实际下载文件计算。Lounge 无音轨，页面选择提示明确说明无声；声音介绍使用 Green blazer。

| 文件 | 来源 | 秒 | 尺寸 | 音频 | 字节 |
| --- | --- | --- | --- | --- | --- |
| `blue-tracksuit.mp4` | [原始视频](https://burningbridgesai.com/sites/burningbridgesai/burning-bridges/community-blue-tracksuit.mp4) | 29.042 | 1280×720 | aac | 7908356 |
| `lounge.mp4` | [原始视频](https://burningbridgesai.com/sites/burningbridgesai/burning-bridges/community-lounge.mp4) | 29.042 | 1280×720 | 无音轨 | 7527125 |
| `green-blazer.mp4` | [原始视频](https://burningbridgesai.com/sites/burningbridgesai/burning-bridges/community/green-blazer.mp4) | 29.048 | 854×480 | aac | 4568052 |

## 文件校验值

- `public/assets/home-inspiration/blue-tracksuit.mp4`：`7812b0bcd6a706a20e7912c713ff3e08eeee61da5f295a42d25068724881e221`
- `public/assets/home-inspiration/blue-tracksuit.jpg`：`ba0845fe68ce6a31cfe1af6563a5e5ab51055848475ab504962e10d4d9d16e66`
- `public/assets/home-inspiration/lounge.mp4`：`251a1b36c78c3fb299126d610978b38d387b3ea5f0138d01fa5fef3532b5f44a`
- `public/assets/home-inspiration/lounge.jpg`：`223137add46d58ea01462398abf5cdb9869cf9ed28d1f67cceef4136e75d95c5`
- `public/assets/home-inspiration/green-blazer.mp4`：`d73abd4e568e94521e637e0e7d28170259b5780cfe1f04b4511425127b23dff2`
- `public/assets/home-inspiration/green-blazer.jpg`：`3cf49373b7937175aa52dd210161772d5a06d2653d74caea1a7e457ebbbfbf80`

## 页面和交互

- 保留 H1、Title、canonical 和既有 SEO 主题；首屏副标题改为照片与派对场景的直接收益表达。
- 案例区紧接上传区，共六个选择：原模板、三条新增真人参考、两条既有角色参考。
- 一个主播放器，默认静音、preload=none；点击选择才播放，切换时停止上一条。页面其他视频开始播放时暂停原播放器，隐藏页面时暂停案例播放器。
- 单独标明 Template preview 与 Trend inspiration。外部素材的时长、服装、背景人物不作为本站输出承诺。
- 新增人物、表演、声音三组图文说明；图片按钮直接选择对应视频。手机点击较低位置卡片后回到播放器，避免在屏外播放。
- FAQ 与其 JSON-LD 同步更正固定输出与服装描述。当前流程仍为单照片、15 秒、720P、16:9、100 credits；没有扩展生成、支付或账号能力。
- 延续既有字体、暖白背景和橙色强调色；桌面三列、手机两列，图文手机单列，保留键盘焦点和减弱动画偏好。

## 验证

- `npm.cmd run check`：通过，21 个页面和 404 的资源与 canonical 检查、分析脚本检查、63 条 FAQ/schema 对照检查、60 项测试全部通过。
- `npm.cmd run build`：通过，`dist` 包含新增三条视频、封面及首页 CSS/JS。本地构建不代表发布。
- Chrome 桌面布局：三列六卡片；390×844 视口：两列，均无横向溢出。
- 六条视频逐条点击播放：均 readyState=4、paused=false、默认 muted=true；每次仅有一个选中卡片。实测原模板 15 秒，两条旧角色参考约 28 秒，新增三条约 29 秒。画面使用 contain，避免裁掉竖向角色参考。
- 快速切换 Blue tracksuit → Green blazer：最终标题和视频均停在 Green blazer，仅一个视频播放。
- 从案例播放器切到生成器模板播放器：案例暂停，状态文案变为 Reference paused。最终控制台无 error/warn。
- 图文区声音图片按钮：正确选择 Green blazer。初始两个播放器 preload=none、readyState=0，没有主动播放。
- 本地 fixture 照片选择、blob 预览和移除通过；720P、16:9、100 credits 保持不变。未登录生产账号、未发起付款或真实生成。
- 截图：`.local/home-desktop.jpg`、`.local/home-mobile.jpg`。预览使用 `http://127.0.0.1:4187/`，本地开发服务的 checkout 关闭。

验证仅覆盖本地页面和现有模拟测试，不代表真实付费生成、GitHub 推送或线上发布。
