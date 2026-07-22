# 部署指南

## 方案 A：Vercel + Neon（推荐）

适合大多数场景，零运维。

### 数据库

1. [Neon](https://neon.tech) 创建 Postgres 项目
2. SQL Editor 执行 `database/001_schema.sql`（或跳过，应用首次访问自动建表）
3. 复制连接字符串

### 环境变量

```env
# 必填
AUTH_SECRET=              # pnpm auth:secret
ADMIN_PASSWORD_HASH=      # pnpm auth:hash -- "your-password"
GITHUB_TOKEN=ghp_xxx
GITHUB_ORG=
DATABASE_URL=postgres://...
CRON_SECRET=              # 任意随机字符串，≥ 24 字符
```

### 部署

推送代码到 GitHub，在 Vercel 导入项目，填入环境变量。Vercel Cron 自动按 `vercel.json` 配置（每天 1:00 UTC）触发调度。

---

## 方案 B：自托管

需要 Node 22+、pnpm、Postgres 16+。

```bash
pnpm install
pnpm build
pnpm start   # 默认端口 3000
```

调度器：应用启动时自动激活内置 `node-cron`，无需额外配置。

自定义调度频率：

```env
CRON_SCHEDULE=0 */6 * * *   # 每 6 小时
```

---

## 方案 C：Docker

```bash
cp .env.docker .env.docker.local
# 编辑 .env.docker.local 填入环境变量
docker compose up -d
```

内部包含 `app` + `postgres:16`，数据卷 `pgdata` 持久化。

调度器：容器启动后自动运行，无需外部 crontab。

自定义调度频率：在 `.env.docker.local` 中设置 `CRON_SCHEDULE`。

---

## 调度机制

三套方案使用同一套调度逻辑：

```
触发方式                     适用方案
─────────                    ────────
Vercel Cron → /api/cron/run  Vercel
内置 node-cron               自托管 / Docker
手动按钮 → /api/stars/snapshot 所有方案
```

调度任务在「系统设置 → 调度任务」中独立开关控制。

## 登录凭证

```bash
pnpm auth:secret              # 生成 AUTH_SECRET
pnpm auth:hash -- "密码"      # 生成 ADMIN_PASSWORD_HASH
```
