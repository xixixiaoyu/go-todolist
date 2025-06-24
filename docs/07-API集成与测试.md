# 📚 Go Todolist 项目学习文档 - 第七章：API 集成与测试

## 🎯 学习目标

通过本章学习，您将掌握：
- 前后端 API 集成的完整流程
- RESTful API 的测试方法
- 错误处理和用户反馈机制
- 性能优化和用户体验提升
- 调试技巧和问题排查

## 📋 API 集成概述

API 集成是连接前端和后端的桥梁，需要确保：

1. **数据格式一致性**：前后端数据结构匹配
2. **错误处理完整性**：优雅处理各种异常情况
3. **用户体验流畅性**：加载状态和反馈机制
4. **性能优化**：减少不必要的请求
5. **安全性考虑**：输入验证和 XSS 防护

## 🔧 API 客户端设计

### 统一的 API 调用函数

```javascript
// API 调用函数 - 带全局加载状态
async function apiCall(url, options = {}) {
  try {
    showLoading()  // 显示全局加载状态
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '请求失败')
    }

    return response.status === 204 ? null : await response.json()
  } catch (error) {
    showMessage(error.message, 'error')
    throw error
  } finally {
    hideLoading()  // 隐藏全局加载状态
  }
}

// API 调用函数 - 不显示全局加载状态（用于局部操作）
async function apiCallWithoutGlobalLoading(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '请求失败')
    }

    return response.status === 204 ? null : await response.json()
  } catch (error) {
    showMessage(error.message, 'error')
    throw error
  }
}
```

### API 设计模式优势

1. **统一错误处理**：所有 API 调用使用相同的错误处理逻辑
2. **加载状态管理**：自动显示和隐藏加载状态
3. **响应格式统一**：统一处理不同的响应状态码
4. **可复用性**：减少重复代码

## 📝 CRUD 操作集成

### 1. 获取待办事项列表

```javascript
// 加载所有待办事项
async function loadTodos() {
  try {
    todos = await apiCall(API_BASE)
    renderTodos()
    updateStats()
  } catch (error) {
    console.error('加载待办事项失败:', error)
    // 错误已在 apiCall 中处理，这里只记录日志
  }
}
```

**集成要点：**
- 使用全局加载状态，提供用户反馈
- 成功后更新界面和统计信息
- 错误处理已在 apiCall 中统一处理

### 2. 创建待办事项

```javascript
// 添加待办事项
async function handleAddTodo(e) {
  e.preventDefault()
  
  const title = titleInput.value.trim()
  const description = descriptionInput.value.trim()
  
  // 客户端验证
  if (!title) {
    showMessage('请输入待办事项标题', 'error')
    return
  }

  // 获取提交按钮，显示局部加载状态
  const submitBtn = addForm.querySelector('button[type="submit"]')
  const originalText = submitBtn.innerHTML

  try {
    // 设置按钮加载状态
    submitBtn.disabled = true
    submitBtn.innerHTML = '<span class="btn-spinner"></span>添加中...'

    const newTodo = await apiCallWithoutGlobalLoading(API_BASE, {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    })

    // 更新本地数据（添加到开头，显示最新的）
    todos.unshift(newTodo)
    renderTodos()
    updateStats()

    // 清空表单
    addForm.reset()
    showMessage('待办事项添加成功！', 'success')
  } catch (error) {
    console.error('添加待办事项失败:', error)
  } finally {
    // 恢复按钮状态
    submitBtn.disabled = false
    submitBtn.innerHTML = originalText
  }
}
```

**集成特点：**
- 客户端预验证，减少无效请求
- 局部加载状态，不影响其他操作
- 乐观更新，立即更新界面
- 详细的用户反馈

### 3. 更新待办事项状态

```javascript
// 切换完成状态
async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id)
  if (!todo) return

  // 乐观更新 - 立即更新界面
  const originalCompleted = todo.completed
  todo.completed = !todo.completed
  renderTodos()
  updateStats()

  try {
    const updatedTodo = await apiCallWithoutGlobalLoading(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: todo.completed }),
    })

    // 使用服务器返回的数据更新本地数据
    const index = todos.findIndex(t => t.id === id)
    todos[index] = updatedTodo
    
    renderTodos()
    updateStats()
    showMessage('状态更新成功！', 'success')
  } catch (error) {
    // 回滚乐观更新
    todo.completed = originalCompleted
    renderTodos()
    updateStats()
    console.error('更新待办事项失败:', error)
  }
}
```

**乐观更新模式：**
- 立即更新界面，提供即时反馈
- 请求失败时回滚更改
- 平衡用户体验和数据一致性

### 4. 删除待办事项

```javascript
// 删除待办事项
async function deleteTodo(id) {
  if (!confirm('确定要删除这个待办事项吗？')) {
    return
  }

  // 找到要删除的待办事项
  const todoIndex = todos.findIndex(t => t.id === id)
  if (todoIndex === -1) return

  // 保存原始数据，用于回滚
  const originalTodo = todos[todoIndex]
  
  // 乐观删除
  todos.splice(todoIndex, 1)
  renderTodos()
  updateStats()

  try {
    await apiCallWithoutGlobalLoading(`${API_BASE}/${id}`, {
      method: 'DELETE',
    })

    showMessage('待办事项删除成功！', 'success')
  } catch (error) {
    // 回滚删除操作
    todos.splice(todoIndex, 0, originalTodo)
    renderTodos()
    updateStats()
    console.error('删除待办事项失败:', error)
  }
}
```

## 🔍 API 测试方法

### 1. 手动测试

#### 使用 curl 命令测试

```bash
# 获取所有待办事项
curl -X GET http://localhost:8080/api/todos

# 创建待办事项
curl -X POST http://localhost:8080/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"测试任务","description":"这是一个测试任务"}'

# 获取单个待办事项
curl -X GET http://localhost:8080/api/todos/1

# 更新待办事项
curl -X PUT http://localhost:8080/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# 删除待办事项
curl -X DELETE http://localhost:8080/api/todos/1
```

#### 使用浏览器开发者工具

```javascript
// 在浏览器控制台中测试
// 获取所有待办事项
fetch('/api/todos')
  .then(response => response.json())
  .then(data => console.log(data))

// 创建待办事项
fetch('/api/todos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: '测试任务',
    description: '这是一个测试任务'
  })
})
.then(response => response.json())
.then(data => console.log(data))
```

### 2. 自动化测试

#### 前端单元测试

```javascript
// 测试 API 调用函数
describe('API Functions', () => {
  test('apiCall should handle successful response', async () => {
    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 1, title: 'Test' }),
      })
    )

    const result = await apiCall('/api/todos')
    expect(result).toEqual({ id: 1, title: 'Test' })
  })

  test('apiCall should handle error response', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad Request' }),
      })
    )

    await expect(apiCall('/api/todos')).rejects.toThrow('Bad Request')
  })
})
```

#### 后端集成测试

```go
func TestTodoHandler(t *testing.T) {
    // 创建测试存储
    storage := storage.NewMemoryStorage()
    handler := handlers.NewTodoHandler(storage)
    
    // 测试创建待办事项
    t.Run("Create Todo", func(t *testing.T) {
        reqBody := `{"title":"测试任务","description":"测试描述"}`
        req := httptest.NewRequest("POST", "/api/todos", strings.NewReader(reqBody))
        req.Header.Set("Content-Type", "application/json")
        
        w := httptest.NewRecorder()
        handler.ServeHTTP(w, req)
        
        assert.Equal(t, http.StatusCreated, w.Code)
        
        var todo models.Todo
        err := json.Unmarshal(w.Body.Bytes(), &todo)
        assert.NoError(t, err)
        assert.Equal(t, "测试任务", todo.Title)
    })
}
```

## 🚨 错误处理策略

### 1. 网络错误处理

```javascript
// 网络连接错误处理
async function handleNetworkError(error) {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    showMessage('网络连接失败，请检查网络连接', 'error')
    return
  }
  
  if (error.name === 'AbortError') {
    showMessage('请求超时，请重试', 'error')
    return
  }
  
  // 其他网络错误
  showMessage('网络请求失败，请稍后重试', 'error')
}
```

### 2. 服务器错误处理

```javascript
// 根据 HTTP 状态码处理错误
function handleHttpError(status, errorMessage) {
  switch (status) {
    case 400:
      showMessage(`请求参数错误：${errorMessage}`, 'error')
      break
    case 404:
      showMessage('请求的资源不存在', 'error')
      break
    case 500:
      showMessage('服务器内部错误，请稍后重试', 'error')
      break
    default:
      showMessage(`请求失败：${errorMessage}`, 'error')
  }
}
```

### 3. 用户输入验证

```javascript
// 客户端验证
function validateTodoInput(title, description) {
  const errors = []
  
  if (!title || title.trim().length === 0) {
    errors.push('标题不能为空')
  }
  
  if (title.length > 100) {
    errors.push('标题长度不能超过100个字符')
  }
  
  if (description.length > 500) {
    errors.push('描述长度不能超过500个字符')
  }
  
  return errors
}
```

## 🎨 用户体验优化

### 1. 加载状态管理

```javascript
// 全局加载状态
function showLoading() {
  document.getElementById('loading').style.display = 'flex'
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none'
}

// 局部加载状态（按钮）
function setButtonLoading(button, loading, loadingText = '处理中...') {
  if (loading) {
    button.disabled = true
    button.dataset.originalText = button.innerHTML
    button.innerHTML = `<span class="btn-spinner"></span>${loadingText}`
  } else {
    button.disabled = false
    button.innerHTML = button.dataset.originalText
  }
}
```

### 2. 消息提示系统

```javascript
// 消息提示
function showMessage(text, type = 'info', duration = 3000) {
  const message = document.getElementById('message')
  message.textContent = text
  message.className = `message ${type}`
  message.style.display = 'block'
  
  // 自动隐藏
  setTimeout(() => {
    message.style.display = 'none'
  }, duration)
}
```

### 3. 数据同步策略

```javascript
// 定期同步数据（可选）
function startDataSync() {
  setInterval(async () => {
    try {
      const serverTodos = await apiCallWithoutGlobalLoading(API_BASE)
      
      // 比较本地和服务器数据
      if (JSON.stringify(todos) !== JSON.stringify(serverTodos)) {
        todos = serverTodos
        renderTodos()
        updateStats()
        showMessage('数据已同步', 'info', 1000)
      }
    } catch (error) {
      // 静默失败，不影响用户操作
      console.warn('数据同步失败:', error)
    }
  }, 30000) // 每30秒同步一次
}
```

## 🧪 调试技巧

### 1. 网络请求调试

```javascript
// 添加请求日志
async function apiCallWithLogging(url, options = {}) {
  console.log(`API Request: ${options.method || 'GET'} ${url}`, options.body)
  
  try {
    const result = await apiCall(url, options)
    console.log(`API Response: ${url}`, result)
    return result
  } catch (error) {
    console.error(`API Error: ${url}`, error)
    throw error
  }
}
```

### 2. 状态调试

```javascript
// 添加状态监控
function debugState() {
  console.log('Current State:', {
    todos: todos.length,
    filter: currentFilter,
    editing: editingTodoId,
  })
}

// 在关键操作后调用
function renderTodos() {
  // ... 渲染逻辑
  debugState()
}
```

## 🎯 本章小结

通过本章学习，我们完成了：

1. ✅ **API 集成设计**：统一的 API 调用模式
2. ✅ **CRUD 操作实现**：完整的数据操作流程
3. ✅ **错误处理机制**：优雅的错误处理和用户反馈
4. ✅ **用户体验优化**：加载状态、消息提示、乐观更新
5. ✅ **测试方法**：手动测试和自动化测试

### 关键收获
- 掌握了前后端 API 集成的完整流程
- 理解了乐观更新和错误回滚机制
- 学会了用户体验优化技巧
- 实现了完整的错误处理策略

### 下一步
在下一章中，我们将进行项目优化和部署，让应用达到生产就绪状态。

---

**API 集成是前后端协作的艺术，良好的集成让应用如丝般顺滑！** 🚀
