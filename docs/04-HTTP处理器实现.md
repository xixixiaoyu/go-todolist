# 📚 Go Todolist 项目学习文档 - 第四章：HTTP 处理器实现

## 🎯 学习目标

通过本章学习，您将掌握：
- Go HTTP 处理器的设计模式
- RESTful API 的实现方法
- HTTP 方法路由的处理技巧
- JSON 序列化和反序列化
- CORS 跨域处理

## 📋 HTTP 处理器概述

HTTP 处理器是 Web 应用的核心组件，负责：

1. **请求路由**：根据 HTTP 方法和路径分发请求
2. **参数解析**：提取 URL 参数和请求体数据
3. **业务调用**：调用存储层进行数据操作
4. **响应生成**：将结果序列化为 JSON 响应
5. **错误处理**：统一的错误响应格式

## 🏗️ 处理器结构设计

### 核心结构

```go
// TodoHandler 处理待办事项相关的HTTP请求
type TodoHandler struct {
    storage storage.TodoStorage
}

// NewTodoHandler 创建新的待办事项处理器
func NewTodoHandler(storage storage.TodoStorage) *TodoHandler {
    return &TodoHandler{storage: storage}
}
```

### 设计原则

1. **依赖注入**：通过构造函数注入存储层
2. **接口依赖**：依赖抽象接口而非具体实现
3. **单一职责**：只处理 HTTP 相关逻辑
4. **无状态设计**：处理器本身不保存状态

## 🌐 RESTful API 设计

### API 路由规划

| HTTP 方法 | 路径 | 功能 | 请求体 | 响应 |
|-----------|------|------|--------|------|
| `GET` | `/api/todos` | 获取所有待办事项 | 无 | Todo 数组 |
| `GET` | `/api/todos/{id}` | 获取单个待办事项 | 无 | Todo 对象 |
| `POST` | `/api/todos` | 创建待办事项 | CreateTodoRequest | Todo 对象 |
| `PUT` | `/api/todos/{id}` | 更新待办事项 | UpdateTodoRequest | Todo 对象 |
| `DELETE` | `/api/todos/{id}` | 删除待办事项 | 无 | 无内容 |

### RESTful 设计原则

1. **资源导向**：URL 表示资源，不是动作
2. **HTTP 方法语义**：使用标准 HTTP 方法
3. **状态码规范**：返回合适的 HTTP 状态码
4. **统一接口**：一致的请求和响应格式

## 🔧 主处理器实现

### ServeHTTP 方法

```go
// ServeHTTP 实现 http.Handler 接口
func (h *TodoHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // 设置 CORS 头
    h.setCORSHeaders(w)

    // 处理 OPTIONS 预检请求
    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusOK)
        return
    }

    // 根据路径和方法路由请求
    switch {
    case r.URL.Path == "/api/todos" && r.Method == http.MethodGet:
        h.handleGetTodos(w, r)
    case r.URL.Path == "/api/todos" && r.Method == http.MethodPost:
        h.handleCreateTodo(w, r)
    case strings.HasPrefix(r.URL.Path, "/api/todos/") && r.Method == http.MethodGet:
        h.handleGetTodo(w, r)
    case strings.HasPrefix(r.URL.Path, "/api/todos/") && r.Method == http.MethodPut:
        h.handleUpdateTodo(w, r)
    case strings.HasPrefix(r.URL.Path, "/api/todos/") && r.Method == http.MethodDelete:
        h.handleDeleteTodo(w, r)
    default:
        h.writeErrorResponse(w, http.StatusMethodNotAllowed, "方法不允许")
    }
}
```

### 路由设计说明

1. **CORS 处理**：每个请求都设置 CORS 头
2. **OPTIONS 处理**：支持预检请求
3. **路径匹配**：使用字符串匹配进行路由
4. **方法检查**：同时检查路径和 HTTP 方法
5. **默认处理**：未匹配的请求返回 405 错误

## 📝 具体处理方法实现

### 1. 获取所有待办事项

```go
// handleGetTodos 处理获取所有待办事项的请求
func (h *TodoHandler) handleGetTodos(w http.ResponseWriter, r *http.Request) {
    todos, err := h.storage.GetAll()
    if err != nil {
        h.writeErrorResponse(w, http.StatusInternalServerError, "获取待办事项失败")
        return
    }

    h.writeJSONResponse(w, http.StatusOK, todos)
}
```

### 2. 获取单个待办事项

```go
// handleGetTodo 处理获取单个待办事项的请求
func (h *TodoHandler) handleGetTodo(w http.ResponseWriter, r *http.Request) {
    id, err := h.extractIDFromPath(r.URL.Path)
    if err != nil {
        h.writeErrorResponse(w, http.StatusBadRequest, "无效的ID")
        return
    }

    todo, err := h.storage.GetByID(id)
    if err != nil {
        if err == storage.ErrTodoNotFound {
            h.writeErrorResponse(w, http.StatusNotFound, "待办事项未找到")
            return
        }
        h.writeErrorResponse(w, http.StatusInternalServerError, "获取待办事项失败")
        return
    }

    h.writeJSONResponse(w, http.StatusOK, todo)
}
```

### 3. 创建待办事项

```go
// handleCreateTodo 处理创建待办事项的请求
func (h *TodoHandler) handleCreateTodo(w http.ResponseWriter, r *http.Request) {
    var req models.CreateTodoRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        h.writeErrorResponse(w, http.StatusBadRequest, "无效的请求格式")
        return
    }

    if err := req.Validate(); err != nil {
        h.writeErrorResponse(w, http.StatusBadRequest, err.Error())
        return
    }

    todo, err := h.storage.Create(&req)
    if err != nil {
        h.writeErrorResponse(w, http.StatusInternalServerError, "创建待办事项失败")
        return
    }

    h.writeJSONResponse(w, http.StatusCreated, todo)
}
```

### 4. 更新待办事项

```go
// handleUpdateTodo 处理更新待办事项的请求
func (h *TodoHandler) handleUpdateTodo(w http.ResponseWriter, r *http.Request) {
    id, err := h.extractIDFromPath(r.URL.Path)
    if err != nil {
        h.writeErrorResponse(w, http.StatusBadRequest, "无效的ID")
        return
    }

    var req models.UpdateTodoRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        h.writeErrorResponse(w, http.StatusBadRequest, "无效的请求格式")
        return
    }

    todo, err := h.storage.Update(id, &req)
    if err != nil {
        if err == storage.ErrTodoNotFound {
            h.writeErrorResponse(w, http.StatusNotFound, "待办事项未找到")
            return
        }
        h.writeErrorResponse(w, http.StatusInternalServerError, "更新待办事项失败")
        return
    }

    h.writeJSONResponse(w, http.StatusOK, todo)
}
```

### 5. 删除待办事项

```go
// handleDeleteTodo 处理删除待办事项的请求
func (h *TodoHandler) handleDeleteTodo(w http.ResponseWriter, r *http.Request) {
    id, err := h.extractIDFromPath(r.URL.Path)
    if err != nil {
        h.writeErrorResponse(w, http.StatusBadRequest, "无效的ID")
        return
    }

    err = h.storage.Delete(id)
    if err != nil {
        if err == storage.ErrTodoNotFound {
            h.writeErrorResponse(w, http.StatusNotFound, "待办事项未找到")
            return
        }
        h.writeErrorResponse(w, http.StatusInternalServerError, "删除待办事项失败")
        return
    }

    w.WriteHeader(http.StatusNoContent)
}
```

## 🛠️ 完整的 handlers/todo.go 实现

```go
package handlers

import (
    "encoding/json"
    "errors"
    "net/http"
    "strconv"
    "strings"

    "go-todolist/models"
    "go-todolist/storage"
)

// TodoHandler 处理待办事项相关的HTTP请求
type TodoHandler struct {
    storage storage.TodoStorage
}

// NewTodoHandler 创建新的待办事项处理器
func NewTodoHandler(storage storage.TodoStorage) *TodoHandler {
    return &TodoHandler{storage: storage}
}

// ErrorResponse 错误响应结构
type ErrorResponse struct {
    Error string `json:"error"`
}

// ServeHTTP 实现 http.Handler 接口
func (h *TodoHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // 设置 CORS 头
    h.setCORSHeaders(w)

    // 处理 OPTIONS 预检请求
    if r.Method == http.MethodOptions {
        w.WriteHeader(http.StatusOK)
        return
    }

    // 根据路径和方法路由请求
    switch {
    case r.URL.Path == "/api/todos" && r.Method == http.MethodGet:
        h.handleGetTodos(w, r)
    case r.URL.Path == "/api/todos" && r.Method == http.MethodPost:
        h.handleCreateTodo(w, r)
    case strings.HasPrefix(r.URL.Path, "/api/todos/") && r.Method == http.MethodGet:
        h.handleGetTodo(w, r)
    case strings.HasPrefix(r.URL.Path, "/api/todos/") && r.Method == http.MethodPut:
        h.handleUpdateTodo(w, r)
    case strings.HasPrefix(r.URL.Path, "/api/todos/") && r.Method == http.MethodDelete:
        h.handleDeleteTodo(w, r)
    default:
        h.writeErrorResponse(w, http.StatusMethodNotAllowed, "方法不允许")
    }
}
```

## 🛠️ 辅助方法实现

### 1. ID 提取方法

```go
// extractIDFromPath 从URL路径中提取ID
func (h *TodoHandler) extractIDFromPath(path string) (int, error) {
    parts := strings.Split(path, "/")
    if len(parts) < 4 {
        return 0, errors.New("无效的路径")
    }
    
    idStr := parts[3]  // /api/todos/{id}
    id, err := strconv.Atoi(idStr)
    if err != nil {
        return 0, errors.New("无效的ID格式")
    }
    
    return id, nil
}
```

### 2. JSON 响应方法

```go
// writeJSONResponse 写入JSON响应
func (h *TodoHandler) writeJSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(data)
}

// writeErrorResponse 写入错误响应
func (h *TodoHandler) writeErrorResponse(w http.ResponseWriter, statusCode int, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}
```

### 3. CORS 处理方法

```go
// setCORSHeaders 设置CORS头
func (h *TodoHandler) setCORSHeaders(w http.ResponseWriter) {
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}
```

## 🔒 错误处理设计

### 错误响应结构

```go
// ErrorResponse 错误响应结构
type ErrorResponse struct {
    Error string `json:"error"`
}
```

### 错误处理策略

1. **分层错误处理**：
   - 输入验证错误 → 400 Bad Request
   - 资源未找到错误 → 404 Not Found
   - 服务器内部错误 → 500 Internal Server Error

2. **统一错误格式**：
   ```json
   {
     "error": "错误描述信息"
   }
   ```

3. **用户友好消息**：使用中文错误消息

## 🌐 CORS 跨域处理

### 为什么需要 CORS？

当前端和后端运行在不同端口时，浏览器会阻止跨域请求。CORS（跨域资源共享）允许服务器明确指定哪些跨域请求是被允许的。

### CORS 头部说明

```go
// 允许所有域名访问
w.Header().Set("Access-Control-Allow-Origin", "*")

// 允许的 HTTP 方法
w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

// 允许的请求头
w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
```

### OPTIONS 预检请求

```go
// 处理 OPTIONS 预检请求
if r.Method == http.MethodOptions {
    w.WriteHeader(http.StatusOK)
    return
}
```

浏览器在发送某些跨域请求前会先发送 OPTIONS 请求来检查是否允许跨域。

## 🧪 HTTP 状态码使用

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 OK | 成功 | GET、PUT 成功 |
| 201 Created | 已创建 | POST 成功创建资源 |
| 204 No Content | 无内容 | DELETE 成功 |
| 400 Bad Request | 请求错误 | 参数验证失败 |
| 404 Not Found | 未找到 | 资源不存在 |
| 405 Method Not Allowed | 方法不允许 | 不支持的 HTTP 方法 |
| 500 Internal Server Error | 服务器错误 | 服务器内部错误 |

## 🎯 本章小结

通过本章学习，我们完成了：

1. ✅ **HTTP 处理器设计**：实现了完整的 RESTful API
2. ✅ **路由处理**：支持多种 HTTP 方法和路径
3. ✅ **JSON 处理**：请求解析和响应序列化
4. ✅ **错误处理**：统一的错误响应格式
5. ✅ **CORS 支持**：解决跨域访问问题

### 关键收获
- 理解了 Go HTTP 处理器的工作原理
- 掌握了 RESTful API 的设计和实现
- 学会了 JSON 序列化和反序列化
- 实现了完整的错误处理机制

### 下一步
在下一章中，我们将实现主程序和路由配置，将所有组件整合起来。

---

**HTTP 处理器是 Web 应用的门面，它决定了 API 的质量和用户体验！** 🚀
