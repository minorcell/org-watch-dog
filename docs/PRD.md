# Watchdog PRD

## 概述

Watchdog 是 1024XEngineer 实训营的后台管理系统，提供 GitHub Star 趋势监控与组织管理。

**环境变量**：`GITHUB_ORG`（监控组织）、`GITHUB_TOKEN`（Admin token）。

---

## 1. 数据模型（3 张核心表）

### `repos` — 仓库表（组织全量镜像）

| 字段 | 类型 | 说明 |
|------|------|------|
| `github_repo` | TEXT PK | `"1024XEngineer/Windup"` |
| `monitoring_enabled` | BOOLEAN | 是否纳入监控（采集 Star、同步成员） |
| `description` | TEXT | 从 GitHub 同步 |
| `homepage_url` | TEXT | 从 GitHub 同步 |
| `topics` | TEXT[] | 从 GitHub 同步 |
| `language` | TEXT | 从 GitHub 同步 |
| `visibility` | TEXT | public / private / internal |
| `synced_at` | TIMESTAMPTZ | 最后一次同步时间 |

### `people` — 人员表

| 字段 | 类型 | 说明 |
|------|------|------|
| `github_id` | TEXT PK | GitHub 用户名 |
| `real_name` | TEXT | 真实姓名（管理员手动填写） |

### `repo_members` — 角色分配

| 字段 | 类型 | 说明 |
|------|------|------|
| `github_repo` | TEXT FK → repos | |
| `github_id` | TEXT FK → people | |
| `role` | TEXT | mentor / assistant / lead / member |
| PK | (github_repo, github_id) | |

### `scheduler_tasks` — 调度任务开关

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | TEXT PK | 任务标识 |
| `enabled` | BOOLEAN | 是否启用 |
| `description` | TEXT | 说明 |

种子数据（4 个任务）：

```
sync-org-repos          — 从 GitHub 同步全量仓库列表
sync-repo-metadata      — 同步监控中仓库的元信息
collect-star-snapshots  — 采集监控中仓库的 Star 快照
sync-team-members       — 同步监控中仓库的 Team 成员
```

---

## 2. 调度器

### 执行机制

Vercel Cron 每天触发 `/api/cron/run` 一次。

调度器从 `scheduler_tasks` 读取 `enabled = true` 的任务，顺序执行。每个任务只处理 `monitoring_enabled = true` 的仓库。任务之间故障隔离。

### 手动触发

仪表板「刷新」按钮触发 `/api/stars/snapshot`，执行同样的调度链。

---

## 3. 数据流

### 3.1 仓库列表同步（sync-org-repos）

```
分页拉取 GET /orgs/{GITHUB_ORG}/repos?per_page=100
  → UPSERT 到 repos 表
  → 新仓库 monitoring_enabled = false
  → 已存在的更新 description/visibility 等字段
```

### 3.2 仓库详情同步（sync-repo-metadata）

```
对 monitoring_enabled = true 的每个仓库：
  GET /repos/{owner}/{name}
    → UPDATE repos SET description, homepage_url, topics, language, ...
```

### 3.3 Star 快照采集（collect-star-snapshots）

```
对 monitoring_enabled = true 的每个仓库：
  GET /repos/{owner}/{name}
    → INSERT 到 repository_star_snapshots
```

### 3.4 成员同步（sync-team-members）

```
对 monitoring_enabled = true 的每个仓库：
  通过 GitHub API 获取 team 成员列表
    → github_id 已存在 → skip
    → github_id 不存在 → INSERT INTO people (github_id)
       real_name 留空，等待管理员填写

不自动分配角色。角色由管理员在管理页面手动设置。
```

---

## 4. 管理页面

### 4.1 系统设置 — 调度任务开关

列出 4 个调度任务，每个任务有开关按钮（enable/disable），启用时纳入每日调度。

### 4.2 系统设置 — 监控仓库列表

纯读 `repos` 表，按 `monitoring_enabled` 排序。筛选：[全部] [监控中] [未监控]。

| 列 | 来源 |
|----|------|
| 仓库名 | repos 表 |
| 描述 / language | repos 表（GitHub 同步） |
| 成员 | repo_members + people |
| 监控开关 | repos.monitoring_enabled（点击切换） |

「从 GitHub 刷新」按钮手动触发 `sync-org-repos` 调度任务。

### 4.3 人员库

| 列 | 操作 |
|----|------|
| GitHub ID | |
| 真实姓名 | 填写/编辑 |
| 角色分配 | 在仓库详情中设置 |

### 4.4 仓库成员编辑

每个仓库展开后可编辑成员角色（导师、助教、组长、组员），从人员库中选择或直接输入 GitHub ID 添加新人。

---

## 5. Star 看板

仪表板仅展示 `monitoring_enabled = true` 的仓库。数据源读取路径：

```
watch-config.ts → listRepos({ monitoringEnabled: true }) → 图表 & 排行榜
```

图表与表格通过 `DashboardClient` 共享筛选器，图表自动跟随表格搜索/可见性筛选。

---

## 6. 验收清单

- [ ] 管理页面可查看/切换 4 个调度任务开关
- [ ] 开关关闭后，Cron 跳过该任务
- [ ] 仓库列表纯读 DB，不调 GitHub API
- [ ] 「从 GitHub 刷新」按钮手动更新仓库列表
- [ ] 监控开关点击即可生效（INSERT/DELETE repos）
- [ ] 仅监控中的仓库参与 Star 采集和排行
- [ ] 人员库可填写 GitHub ID → 真实姓名映射
- [ ] 仓库可分配 mentor/assistant/lead/member 角色
- [ ] 同步成员时新 GitHub ID 自动入库，姓名留空
- [ ] 仪表板仓库详情抽屉展示描述/topics/成员/角色
- [ ] 点击仓库名可跳转 GitHub，点击成员可跳转 GitHub Profile
- [ ] 图表与表格筛选联动
- [ ] 侧边栏可折叠
- [ ] 暗色/亮色模式切换
- [ ] 退出登录需二次确认
- [ ] Toast 通知操作结果
- [ ] 一次 YAML 导入，之后不再依赖 YAML
