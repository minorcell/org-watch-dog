# Watchdog

面向 GitHub 组织的数据分析与实训管理平台。帮助管理者从 GitHub 拉取仓库数据、追踪 Star 趋势、分析团队指标。

部署到 Vercel + Neon，零服务器运维。

## 功能

**已实现**

- Star 看板 — 趋势图表 + 排行榜，时间范围切换、搜索、可见性筛选、CSV 导出
- 监控管理 — 实时同步组织仓库列表，按需开关监控
- 调度引擎 — 可扩展任务队列，元信息同步、快照采集独立开关
- 管理员认证 — bcrypt + JWT HttpOnly Cookie

**规划中**

- 成员活跃度分析（commits、PRs、reviews）
- 团队协作报告
- 自定义数据看板

## 快速开始

```bash
pnpm install
pnpm auth:secret
pnpm auth:hash -- "your-password"
cp .env.example .env.local   # 编辑填入环境变量
pnpm dev                     # http://localhost:3000
```

## 部署

- [Vercel + Neon](docs/deployment.md#方案-avercel--neon推荐)
- [自托管](docs/deployment.md#方案-b自托管)
- [Docker](docs/deployment.md#方案-cdocker)

## 技术栈

Next.js 16 · React 19 · Tailwind CSS v4 · shadcn/ui · Neon Postgres · Recharts · TanStack Table · Vercel Cron

## License

MIT
