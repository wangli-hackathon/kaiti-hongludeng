# 开题红绿灯

把研究问题、摘要和参考文献贴进浏览器，得到一张绿 / 黄 / 红自查：问题清不清楚、新不新、做不做得到、方法和问题是否同一件事、数据拿不拿得到、伦理、范围与时间、文献新旧。每项附一句理由。接着是五句导师反问，和一份每天只做一件事的七日行动单。可以复制 Markdown，或用浏览器打印存成 PDF。

不配置任何密钥也能走完。规则在本地运行：关键词、结构和文献年份，灯色怎么打可以在页面里点开看。想要更冲着你的用词的评语时，再在设置里填写自己的 OpenAI 兼容接口（例如通义千问 DashScope）。

这是 2026 Qoder 高校创造力大赛 **StudyHack** 赛道的作品草稿。截止时间是 **2026-11-30 18:00（北京时间）**。报名、学生认证、在 Qoder 里打开项目、部署到 Qoder Sites、到天池论坛发帖，都要使用参赛者本人的账号。

## 本地运行

需要 Node.js 22 左右。

```bash
npm install
npm test
npm run dev
```

开发服务器在 [http://127.0.0.1:4179](http://127.0.0.1:4179)。

```bash
npm run lint      # oxlint
npm run build     # 类型检查 + 静态产物 dist/
npm run selfcheck # lint、测试、构建一起跑
npm run preview   # 预览 dist，同样是 4179 端口
```

`vite.config.ts` 里 `base` 是 `./`。静态资源用相对路径，挂到站点子路径时也不容易白屏。

## 规则引擎

入口是 `src/engine/analyze.ts` 的 `analyzeProposal`。八个维度、五条反问、七天行动都由它返回。文献年份以 2026 年为基准，近五年指 2021 及以后。页面上的「灯怎么打」和 `src/engine/types.ts` 里的 `RULE_BRIEFS` 是同一套说明。

测试在 `src/**/*.test.ts`，用 Vitest 跑。三份内置示例分别锁定为黄灯、绿灯、红灯，避免规则改着改着示例都变成一个颜色。

示例：

- 教育技术：短视频与深度学习（因果问法配问卷，黄灯）
- 软件工程：GitHub 评审与缺陷条数（公开数据的观察研究，绿灯）
- 公共卫生：农村老年健康（口号、病历、两周全国推广，红灯）

## 模型增强

设置面板里的接口根路径、API 密钥和模型名只写入浏览器 `localStorage`（键名 `kaiti-hongludeng-llm-v1`）。请求由浏览器直接发到你填的地址，路径会补上 `/chat/completions`。

通义千问兼容模式示例：

- 接口：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- 模型：`qwen-plus`

很多接口不允许浏览器跨域，页面上的测试连接会失败。失败时规则报告照常可用。灯色不会被模型改写。导出的 Markdown 不含密钥。

## 在 Qoder 里打开

文档核对日期：2026-11-09。Qoder 与 Qoder CN 是两套产品，账号、任务和数据不互通。参赛请用你准备拿去报名的那一套，并亲自登录。

依据 [Qoder 快速入门](https://docs.qoder.com/zh/qoder/quickstart) 和 [产品系列说明](https://docs.qoder.com/zh/product-series/quick-start)：

1. 从 [https://qoder.com/download](https://qoder.com/download) 安装 Qoder，用你自己的账号登录。
2. 启动后在左上角选择「编程」。把本仓库所在文件夹添加为工作区。关联之后，确认输入区显示的是这个项目和当前分支。
3. 在 Qoder 终端执行 `npm install`，再执行 `npm test` 和 `npm run build`，确认生成 `dist/`。
4. 用一次 Qoder 做你自己的修改并留下记录，例如改一处文案、补一条你导师真会问的反问，然后重新跑 `npm test`。论坛帖和路演需要讲「你定方向、Qoder 实现、你验收改了什么」，这一步不能省。

如果 `/sites` 没有反应，先把客户端升到支持站点的版本再继续。桌面端和 CLI 的站点能力以官方文档当时的版本说明为准。

## 部署到 Qoder Sites

作品必须公开、免登录能打开。个人 Free 版只支持静态网站，不支持数据库和存储，这个项目正好是纯静态页面。

官方说明：

- IDE：[站点](https://docs.qoder.com/zh/qoder/sites)（中文），[Sites](https://docs.qoder.com/qoder/sites)（英文）
- Qoder CN：[站点](https://docs.qoder.cn/qoder/sites)
- CLI：[Sites 站点构建与托管](https://docs.qoder.com/zh/cli/sites)

推荐用现有的 `dist`，不要让站点向导把页面重新生成一遍。CLI 文档写明可以从现有项目构建，并举例「帮我把 dist 发布成站点」，对应技能 `sites:sites-building`。

1. 确认 `npm run build` 已经产出 `dist/`。
2. 在 Qoder 会话里说明要发布的是当前仓库的静态产物。可以直接写：

   ```text
   @sites 把当前项目 npm run build 生成的 dist 作为静态站点发布。不要重写页面，不要加数据库。base 已是相对路径。先给预览，我确认后再发布。
   ```

   使用 CLI 时，在交互会话里用同样的话触发 `sites:sites-building`。写操作会先向你复述影响，等你确认才执行。
3. 也可以从左侧栏进入「站点」，点「添加站点」。新任务会带上 `@sites`。把上面那段要求贴进去，并说明发布目录是 `dist`。
4. 预览里点开三份示例，确认黄灯、绿灯、红灯、五条反问、七日行动、复制 Markdown 和打印都能用。手机宽度也看一眼。
5. 在站点面板右上角点「发布」，等到状态变成已发布。打开发布详情里的地址，点「访问」再检查一次。
6. 新站点默认只有自己能访问。竞赛要求评委不登录就能打开。在站点列表或详情里点「分享」→「更改访问范围」→「任何人都可访问」，再点「允许公开访问」确认。然后复制链接，用无痕窗口打开。
7. 地址前缀可以在「更多 → 设置 → 常规」里改，后缀是固定的。公开赛讯里常见 `*.qoder.website` 或 `*.qoder.zone`，以发布详情里显示的地址为准。

发布之后如果改了代码，要重新构建，再回到原会话更新预览，然后再次点「发布」。只改本地预览不会替换线上页面。

站点上的 AI 生成内容标识按《人工智能生成合成内容标识办法》不能去掉。浏览器 `localStorage` 里的密钥不会随站点同步给访客，每个打开网站的人看到的都是未配置模型的规则版，这是预期行为。

## 参赛时还要你本人做的

- 阿里云实名、天池实名、大学生认证、报名或一人成队
- 用你的 Qoder 账号完成上面的打开、修改和 Sites 发布
- 把公开链接写进天池论坛帖。帖子草稿在 `FORUM_POST.md`，路演和录屏分镜在 `DEMO_SCRIPT.md`
- 帖子里的学校、专业、年级、Qoder 账号名称和账号 ID 换成你自己的。账号 ID 在 Qoder「设置 → 个人资料 → 编辑」

## 目录

```text
src/engine/     规则引擎与 Vitest
src/components/ 页面
src/samples.ts  三份示例
src/llm.ts      可选的兼容接口调用
dist/           npm run build 之后的静态文件
```

## 许可

MIT，见 `LICENSE`。
