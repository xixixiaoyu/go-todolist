# 🏋️ Go Todolist 实践练习

## 📚 练习说明

这些练习按难度递增，帮助您深入理解项目的各个方面。每个练习都包含详细的实现指导和预期结果。

## 🟢 基础练习 (入门级)

### 练习 1: 添加优先级字段

**目标**: 为待办事项添加优先级功能

**任务**:
1. 修改 `models/todo.go`，添加 `Priority` 字段
2. 更新创建和更新请求结构
3. 修改前端界面，添加优先级选择
4. 实现按优先级排序

**实现提示**:
```go
// 在 Todo 结构体中添加
Priority string `json:"priority"` // "high", "medium", "low"

// 在 CreateTodoRequest 中添加
Priority string `json:"priority"`
```

**前端实现**:
```html
<select id="priority-select">
    <option value="low">低优先级</option>
    <option value="medium">中优先级</option>
    <option value="high">高优先级</option>
</select>
```

**预期结果**: 
- 可以为待办事项设置优先级
- 列表按优先级排序显示
- 不同优先级有不同的视觉标识

### 练习 2: 实现搜索功能

**目标**: 添加待办事项搜索功能

**任务**:
1. 在前端添加搜索输入框
2. 实现实时搜索过滤
3. 高亮搜索关键词
4. 添加搜索历史记录

**实现提示**:
```javascript
// 搜索过滤函数
function filterTodosBySearch(todos, searchTerm) {
    if (!searchTerm) return todos;
    
    return todos.filter(todo => 
        todo.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        todo.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
}

// 防抖搜索
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
```

**预期结果**:
- 输入搜索词时实时过滤结果
- 搜索词在结果中高亮显示
- 搜索性能良好（使用防抖）

### 练习 3: 添加截止日期

**目标**: 为待办事项添加截止日期功能

**任务**:
1. 在数据模型中添加 `DueDate` 字段
2. 前端添加日期选择器
3. 实现过期提醒功能
4. 按截止日期排序

**实现提示**:
```go
// 在 Todo 结构体中添加
DueDate *time.Time `json:"due_date,omitempty"`
```

```javascript
// 检查是否过期
function isOverdue(dueDate) {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
}

// 格式化剩余时间
function formatTimeRemaining(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;
    
    if (diff < 0) return '已过期';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}天后到期`;
    if (hours > 0) return `${hours}小时后到期`;
    return '即将到期';
}
```

**预期结果**:
- 可以设置待办事项的截止日期
- 过期的待办事项有特殊标识
- 显示剩余时间提醒

## 🟡 中级练习 (进阶级)

### 练习 4: 实现数据持久化

**目标**: 将内存存储替换为 SQLite 数据库

**任务**:
1. 安装 SQLite 驱动
2. 创建数据库表结构
3. 实现 DatabaseStorage
4. 添加数据库迁移功能

**实现提示**:
```bash
# 安装依赖
go get github.com/mattn/go-sqlite3
```

```go
// storage/database.go
package storage

import (
    "database/sql"
    _ "github.com/mattn/go-sqlite3"
    "go-todolist/models"
)

type DatabaseStorage struct {
    db *sql.DB
}

func NewDatabaseStorage(dbPath string) (*DatabaseStorage, error) {
    db, err := sql.Open("sqlite3", dbPath)
    if err != nil {
        return nil, err
    }
    
    storage := &DatabaseStorage{db: db}
    if err := storage.createTables(); err != nil {
        return nil, err
    }
    
    return storage, nil
}

func (s *DatabaseStorage) createTables() error {
    query := `
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`
    
    _, err := s.db.Exec(query)
    return err
}
```

**预期结果**:
- 数据在服务器重启后仍然保存
- 支持并发访问
- 具备基本的数据库操作功能

### 练习 5: 添加用户认证

**目标**: 实现用户注册、登录和权限控制

**任务**:
1. 创建用户模型和存储
2. 实现 JWT 认证
3. 添加认证中间件
4. 修改前端支持登录

**实现提示**:
```go
// models/user.go
type User struct {
    ID       int    `json:"id"`
    Username string `json:"username"`
    Email    string `json:"email"`
    Password string `json:"-"` // 不序列化密码
}

// handlers/auth.go
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
    // 验证用户凭据
    // 生成 JWT token
    // 返回 token
}

// middleware/auth.go
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // 验证 JWT token
        // 设置用户上下文
        next.ServeHTTP(w, r)
    })
}
```

**预期结果**:
- 用户可以注册和登录
- 只有登录用户可以访问待办事项
- 每个用户只能看到自己的待办事项

### 练习 6: 实现实时更新

**目标**: 使用 WebSocket 实现多用户实时同步

**任务**:
1. 添加 WebSocket 支持
2. 实现消息广播机制
3. 前端连接 WebSocket
4. 处理连接断开和重连

**实现提示**:
```go
// websocket/hub.go
type Hub struct {
    clients    map[*Client]bool
    broadcast  chan []byte
    register   chan *Client
    unregister chan *Client
}

func (h *Hub) run() {
    for {
        select {
        case client := <-h.register:
            h.clients[client] = true
            
        case client := <-h.unregister:
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
            }
            
        case message := <-h.broadcast:
            for client := range h.clients {
                select {
                case client.send <- message:
                default:
                    close(client.send)
                    delete(h.clients, client)
                }
            }
        }
    }
}
```

```javascript
// 前端 WebSocket 连接
class TodoWebSocket {
    constructor() {
        this.connect();
    }
    
    connect() {
        this.ws = new WebSocket('ws://localhost:8080/ws');
        
        this.ws.onmessage = (event) => {
            const update = JSON.parse(event.data);
            this.handleUpdate(update);
        };
        
        this.ws.onclose = () => {
            // 重连逻辑
            setTimeout(() => this.connect(), 3000);
        };
    }
    
    handleUpdate(update) {
        // 处理实时更新
        switch (update.type) {
            case 'todo_created':
                this.addTodoToList(update.todo);
                break;
            case 'todo_updated':
                this.updateTodoInList(update.todo);
                break;
            case 'todo_deleted':
                this.removeTodoFromList(update.id);
                break;
        }
    }
}
```

**预期结果**:
- 多个用户同时操作时实时同步
- 连接断开时自动重连
- 良好的错误处理和用户提示

## 🔴 高级练习 (专家级)

### 练习 7: 微服务架构重构

**目标**: 将单体应用拆分为微服务

**任务**:
1. 拆分用户服务和待办事项服务
2. 实现服务间通信
3. 添加 API 网关
4. 实现服务发现

**架构设计**:
```
API Gateway
    ├── User Service (端口 8081)
    │   ├── 用户注册/登录
    │   ├── 用户信息管理
    │   └── JWT 令牌验证
    └── Todo Service (端口 8082)
        ├── 待办事项 CRUD
        ├── 权限验证
        └── 数据存储
```

### 练习 8: 性能优化和监控

**目标**: 添加性能监控和优化

**任务**:
1. 添加请求日志和指标收集
2. 实现缓存机制
3. 添加限流功能
4. 性能分析和优化

**实现提示**:
```go
// middleware/metrics.go
func MetricsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        // 包装 ResponseWriter 以捕获状态码
        wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}
        
        next.ServeHTTP(wrapped, r)
        
        duration := time.Since(start)
        
        // 记录指标
        log.Printf("Method: %s, Path: %s, Status: %d, Duration: %v",
            r.Method, r.URL.Path, wrapped.statusCode, duration)
    })
}

// cache/redis.go
type RedisCache struct {
    client *redis.Client
}

func (c *RedisCache) Get(key string) (string, error) {
    return c.client.Get(key).Result()
}

func (c *RedisCache) Set(key string, value interface{}, expiration time.Duration) error {
    return c.client.Set(key, value, expiration).Err()
}
```

### 练习 9: 容器化和部署

**目标**: 使用 Docker 容器化应用并部署

**任务**:
1. 编写 Dockerfile
2. 创建 docker-compose.yml
3. 配置 CI/CD 流水线
4. 部署到云平台

**实现提示**:
```dockerfile
# Dockerfile
FROM golang:1.19-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/

COPY --from=builder /app/main .
COPY --from=builder /app/static ./static

EXPOSE 8080
CMD ["./main"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - DB_PATH=/data/todos.db
    volumes:
      - ./data:/data
    depends_on:
      - redis
      
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

## 🎯 练习评估标准

### 代码质量
- [ ] 代码结构清晰，命名规范
- [ ] 错误处理完善
- [ ] 注释充分，文档完整
- [ ] 遵循 Go 语言最佳实践

### 功能完整性
- [ ] 所有要求的功能都已实现
- [ ] 边界情况处理得当
- [ ] 用户体验良好
- [ ] 性能表现优秀

### 技术深度
- [ ] 理解底层原理
- [ ] 能够解释设计决策
- [ ] 考虑了扩展性和维护性
- [ ] 应用了合适的设计模式

## 📝 提交要求

每个练习完成后，请提交：

1. **源代码** - 完整的项目代码
2. **README** - 详细的实现说明
3. **测试用例** - 功能测试和单元测试
4. **演示视频** - 功能演示和代码讲解
5. **学习总结** - 遇到的问题和解决方案

## 🤝 获得帮助

如果在练习过程中遇到问题：

1. 查阅官方文档和学习资源
2. 在社区论坛提问
3. 与其他学习者交流讨论
4. 寻求导师或专家指导

记住，编程是一个实践的过程，通过这些练习，您将深入理解现代 Web 应用开发的各个方面！

---

**祝您练习顺利，学有所成！** 🚀
