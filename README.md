# 法律观点对比助手 — 知乎黑客松 S3（湾区共创季）

赛道：AI × 知识与探索。作品提交窗口：12-05 10:00–12-07 10:00。决赛：12-19。

## 产品是什么

用户用中文 / 英文 / 俄文提问一个法律问题，系统：

1. 调知乎搜索（zhihu_search）找相关问题与回答；
2. 对选中的问题调问题回答摘要（question_answers），多条回答摘要并列展示；
3. 调知乎直答（zhida）归纳观点对比（共识 / 分歧），按提问语言呈现；
4. 每个结论都带溯源链接回知乎原文。

OAuth 登录不在 MVP 里（以后做可选模块）。知识库 RAG 是第二阶段，这版只留接口占位，先不做。

## 怎么运行

```bash
cd zhihu-s3
npm install   # 零依赖，这步只是确认；没有 node_modules 也能跑
node server.js
```

打开 http://localhost:3000 。

默认端口 3000，可用环境变量改：`PORT=8080 node server.js`。

## 模拟模式（默认）

没有配置 Access Secret 时，服务走模拟模式：全部接口返回结构真实的模拟数据，
提问 → 搜索 → 多回答并列 → 直答归纳 → 溯源链接，全流程不用凭证也能端到端跑通、
能演示。页面顶部会显示“模拟模式”。

模拟数据是固定演示数据集（示例问题“未成年人签订的合同有效吗？”），
内容为演示用，结构与真实 API 一致。

## 真实联调需要什么

1. 在 https://developer.zhihu.com/profile 手动生成 Access Secret（本人操作）。
2. 启动时注入环境变量，不要写进任何文件：
   ```bash
   ZHIHU_ACCESS_SECRET=你的Secret node server.js
   ```
   也可以复制 `.env.example` 为 `.env` 填入（`.env` 已在 `.gitignore` 里，不会进仓库）。
   注意：本项目不读 `.env` 文件，只读进程环境变量；用 `.env` 时请用 `export $(cat .env | xargs)` 之类方式注入，或直接在启动命令前加变量。
3. 页面顶部会变成“真实数据模式”，并显示各接口剩余额度。

联调前还需 Allen 本人确认（不在代码里解决）：

- 天何言哉账号的实名状态（决定搜索额度是每天 10 次还是 5000 次）。
- $800 Token 补贴领取流程、“知乎问答 API”到底是哪个接口、App ID 开发期能否提前领——都在飞书技术指南里（只读打不开，需本人登录或问官方小助手）。

## API 路由（本服务）

| 路由 | 说明 |
| --- | --- |
| GET /api/status | 模式（mock/live）、Secret 是否配置、示例问题 |
| GET /api/quota | 各额度项剩余额度（真实模式走知乎额度查询接口） |
| GET /api/search?query=...&count=10 | 知乎搜索；count 最大 10，无翻页 |
| GET /api/answers?questionUrl=...&offset=0&limit=20 | 某问题下的多条回答摘要；limit 1–50，可翻页 |
| POST /api/compare | 直答归纳观点对比。Body：{ question, answers: [{summary, url}], language: zh/en/ru, model: fast/thinking/agent } |

额度与降级：调用前查额度，某组额度明确为 0 时返回模拟数据并标记 degraded；
额度查不到时不拦截调用。搜索/回答结果按查询缓存 1 小时（额度按最小口径每天每组
100 次设计，不要按最大数字规划调用量）。

## 文件清单

- server.js — Node 服务：托管静态前端 + /api 路由（零依赖）
- api/ — Vercel Serverless Functions 入口（status/quota/search/answers/compare 各一薄层，复用 lib/api.js；public/ 由 Vercel 静态托管）
- lib/vercel.js — Vercel 适配层（读请求体 → 调 lib/api.js → 发 JSON）
- worker.js — Cloudflare Workers 入口（fetch handler，复用 lib/api.js）
- wrangler.toml — Workers 部署配置（免费层，Static Assets 托管 public/）
- lib/api.js — 与运行环境无关的 API 路由（Node 与 Workers 共用）
- lib/zhihu.js — 知乎官方 API 客户端（搜索 / 问题回答 / 直答 / 额度查询）
- lib/mock.js — 模拟数据（搜索 / 回答 / 对比归纳 / 额度）
- public/index.html — 前端页面
- public/app.js — 前端逻辑（提问 → 搜索 → 回答并列 → 对比，三语界面）
- public/styles.css — 前端样式
- package.json — 无依赖，只有启动脚本
- .env.example — 环境变量模板（无真实值）
- .gitignore — 排除 node_modules 与 .env

## 部署到 Vercel（Hobby 免费层，当前主路）

官网定价页 2026-11-24 核实：Hobby 免费，函数调用 100 万次/月、CDN 请求 100 万次/月、
快速传输 100GB/月；免费账号超额不能额外购买（不会意外扣费）。绑卡与否定价页没写，
注册时以实际页面为准。

```bash
# 在 Vercel 控制台用 GitHub 账号（ValeriaWong）登录，Import 这个仓库即可；
# 不需要构建命令，public/ 自动静态托管，api/ 下五个文件自动成为函数。
```

真实数据模式（以后联调时）：在 Vercel 项目 Settings → Environment Variables
里加 `ZHIHU_ACCESS_SECRET`（只进 Vercel 的加密存储，不写进代码和仓库），
重新部署一次即可。

## 部署到 Cloudflare（已放弃：账号层 Error 1101）

2026-11-22 实测：部署成功但全站报 Error 1101；连控制台手工建的 Hello World
也报 1101，日志完全空白，请求根本没进 Worker 代码——与代码、wrangler 无关，
是账号/平台层问题。改走 Vercel。worker.js 与 wrangler.toml 留在仓库作记录，
测试用的两个诊断 Worker（zhihu-s3-smoke-test、zhihu-s3-dash-test）待清理。

已适配好，本地已用 `wrangler dev` 验证通过（页面 200，/api/status、/api/search、
/api/answers、/api/compare、/api/quota 全通，模拟模式）。

前置条件（本机目前没有，需要 Allen 做一次）：

1. 有一个 Cloudflare 账号（免费即可，不绑卡），并在本机登录一次：
   ```bash
   npx wrangler login
   ```
   这一步会在浏览器里打开 Cloudflare 授权页，由 Allen 本人点确认；
   也可以改用 API Token（`CLOUDFLARE_API_TOKEN` + 账号 ID），同样由他提供。
   没有这一步部署不出去——不要用 `wrangler deploy --temporary`（临时预览
   账号，链接不持久）或 trycloudflare 之类短命隧道充数。

部署（登录一次之后）：

```bash
cd zhihu-s3
npm run deploy        # 即 wrangler deploy
```

部署成功后公开演示链接形如：

`https://zhihu-s3-viewpoint-compare.<你的 workers 子域名>.workers.dev`

更新：改完代码再跑一次 `npm run deploy` 即可。本地仍用 `node server.js`
（http://localhost:3000），Node 服务与 Workers 入口共用同一套 API 逻辑。

真实数据模式（以后联调时）：

```bash
npx wrangler secret put ZHIHU_ACCESS_SECRET   # 按提示粘贴，不写进任何文件
npm run deploy
```

Secret 只进 Cloudflare 的加密存储，不出现在代码、配置或聊天记录里。
模拟模式不需要 Secret，部署出来默认就是模拟模式。

## 部署改动（2026-11-21）

- 新增 `worker.js`：Cloudflare Workers 入口（fetch handler），/api 走同一套
  逻辑，非 /api 请求由 Static Assets（public/）托管。
- 新增 `wrangler.toml`：Worker 名 `zhihu-s3-viewpoint-compare`，
  `compatibility_flags = ["nodejs_compat"]`，assets 目录 `./public`。
- 新增 `lib/api.js`：把原来 server.js 里的 API 路由抽成与运行环境无关的
  纯逻辑（输入 `{method, pathname, searchParams, body}`，输出
  `{status, json}`），Node 服务与 Workers 入口共用。
- server.js 改为薄适配层（读请求体 → 调 lib/api.js → 发 JSON），本地行为
  不变，改后已回归实测全部接口通过。
- package.json：wrangler 加为 devDependency，新增 `dev` / `deploy` 脚本。

## 约束（已落实）

- Access Secret 只从环境变量读；代码、文件、README 里没有任何真实 Secret。
- 只用 2026-11-21 已核实的四个知乎接口形态，不调用未核实的接口。
- 不爬虫取全文：官方只给摘要，全文靠链接溯源。
- 全部代码全新编写，不复制任何现有项目；免费 only，无付费服务。
