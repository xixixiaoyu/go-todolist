# 📝 Go Todolist 应用

一个使用 Go 语言后端 + 原生前端技术栈构建的现代化待办事项管理应用。

## ✨ 功能特性

### 前端功能
- 📱 **响应式设计** - 完美适配桌面端和移动端
- ➕ **添加待办事项** - 支持标题和描述
- ✅ **状态切换** - 一键标记完成/未完成
- ✏️ **编辑功能** - 模态框编辑待办事项
- 🗑️ **删除功能** - 确认删除保护
- 🔍 **筛选功能** - 全部/待完成/已完成筛选
- 📊 **统计信息** - 实时显示任务统计
- 💫 **流畅交互** - 加载提示和消息反馈

### 后端功能
- 🚀 **RESTful API** - 标准的 REST 接口设计
- 🔒 **数据验证** - 完整的输入验证和错误处理
- 🌐 **CORS 支持** - 跨域访问支持
- 💾 **内存存储** - 高性能内存数据存储
- 🔄 **并发安全** - 线程安全的数据操作
- 📝 **结构化日志** - 清晰的服务器日志

## 🛠️ 技术栈

### 后端
- **Go 1.19+** - 主要编程语言
- **net/http** - HTTP 服务器（标准库）
- **encoding/json** - JSON 处理（标准库）
- **sync** - 并发控制（标准库）

### 前端
- **HTML5** - 语义化页面结构
- **CSS3** - 现代化样式设计
- **JavaScript ES6+** - 原生 JavaScript 交互
- **Fetch API** - HTTP 请求处理

## 📁 项目结构

```
go-todolist/
├── main.go              # 主程序入口
├── go.mod               # Go 模块文件
├── handlers/            # HTTP 处理器
│   └── todo.go         # 待办事项处理器
├── models/              # 数据模型
│   └── todo.go         # 待办事项模型
├── storage/             # 数据存储层
│   └── memory.go       # 内存存储实现
├── static/              # 静态文件
│   ├── index.html      # 主页面
│   ├── style.css       # 样式文件
│   └── script.js       # 交互脚本
└── README.md           # 项目文档
```

## 🚀 快速开始

### 环境要求
- Go 1.19 或更高版本
- 现代浏览器（支持 ES6+）

### 安装和运行

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd go-todolist
   ```

2. **安装依赖**
   ```bash
   go mod tidy
   ```

3. **启动服务器**
   ```bash
   go run main.go
   ```

4. **访问应用**
   - 前端地址: http://localhost:8080
   - API 地址: http://localhost:8080/api/todos

### 自定义端口
```bash
PORT=3000 go run main.go
```

## 📚 API 文档

### 基础信息
- **Base URL**: `/api/todos`
- **Content-Type**: `application/json`
- **CORS**: 支持跨域访问

### 接口列表

#### 1. 获取所有待办事项
```http
GET /api/todos
```

**响应示例:**
```json
[
  {
    "id": 1,
    "title": "学习 Go 语言",
    "description": "完成 Go 语言基础教程",
    "completed": false,
    "created_at": "2025-06-24T10:00:00Z",
    "updated_at": "2025-06-24T10:00:00Z"
  }
]
```

#### 2. 获取单个待办事项
```http
GET /api/todos/{id}
```

**响应示例:**
```json
{
  "id": 1,
  "title": "学习 Go 语言",
  "description": "完成 Go 语言基础教程",
  "completed": false,
  "created_at": "2025-06-24T10:00:00Z",
  "updated_at": "2025-06-24T10:00:00Z"
}
```

#### 3. 创建待办事项
```http
POST /api/todos
```

**请求体:**
```json
{
  "title": "学习 Go 语言",
  "description": "完成 Go 语言基础教程"
}
```

**响应:** 201 Created + 创建的待办事项

#### 4. 更新待办事项
```http
PUT /api/todos/{id}
```

**请求体:**
```json
{
  "title": "学习 Go 语言进阶",
  "description": "完成 Go 语言进阶教程",
  "completed": true
}
```

**响应:** 200 OK + 更新后的待办事项

#### 5. 删除待办事项
```http
DELETE /api/todos/{id}
```

**响应:** 204 No Content

### 错误响应
所有错误响应都使用以下格式：
```json
{
  "error": "错误信息"
}
```

**状态码说明:**
- `200` - 成功
- `201` - 创建成功
- `204` - 删除成功
- `400` - 请求错误
- `404` - 资源未找到
- `500` - 服务器错误

## 🧪 测试指南

### 手动测试

1. **启动应用**
   ```bash
   go run main.go
   ```

2. **测试前端功能**
   - 访问 http://localhost:8080
   - 添加几个待办事项
   - 测试编辑、删除、状态切换功能
   - 测试筛选功能

3. **测试 API 接口**
   ```bash
   # 获取所有待办事项
   curl http://localhost:8080/api/todos
   
   # 创建待办事项
   curl -X POST http://localhost:8080/api/todos \
     -H "Content-Type: application/json" \
     -d '{"title":"测试任务","description":"这是一个测试任务"}'
   
   # 更新待办事项
   curl -X PUT http://localhost:8080/api/todos/1 \
     -H "Content-Type: application/json" \
     -d '{"completed":true}'
   
   # 删除待办事项
   curl -X DELETE http://localhost:8080/api/todos/1
   ```

## 🔧 开发说明

### 数据存储
当前使用内存存储，重启服务器后数据会丢失。如需持久化存储，可以：
- 集成 SQLite 数据库
- 使用 JSON 文件存储
- 连接 PostgreSQL/MySQL

### 扩展功能
- 用户认证和授权
- 待办事项分类和标签
- 截止日期和提醒
- 文件附件支持
- 团队协作功能

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**享受使用 Go Todolist 应用！** 🎉
