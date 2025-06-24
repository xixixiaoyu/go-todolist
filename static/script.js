// 全局变量
let todos = []
let currentFilter = 'all'
let editingTodoId = null

// DOM 元素
const addForm = document.getElementById('add-form')
const titleInput = document.getElementById('title-input')
const descriptionInput = document.getElementById('description-input')
const todosList = document.getElementById('todos-list')
const emptyState = document.getElementById('empty-state')
const totalCount = document.getElementById('total-count')
const completedCount = document.getElementById('completed-count')
const pendingCount = document.getElementById('pending-count')
const filterButtons = document.querySelectorAll('.filter-btn')
const editModal = document.getElementById('edit-modal')
const editForm = document.getElementById('edit-form')
const editTitle = document.getElementById('edit-title')
const editDescription = document.getElementById('edit-description')
const editCompleted = document.getElementById('edit-completed')
const modalClose = document.getElementById('modal-close')
const cancelEdit = document.getElementById('cancel-edit')
const loading = document.getElementById('loading')
const message = document.getElementById('message')

// API 基础 URL
const API_BASE = '/api/todos'

// 初始化应用
document.addEventListener('DOMContentLoaded', function () {
  loadTodos()
  setupEventListeners()
})

// 设置事件监听器
function setupEventListeners() {
  // 添加待办事项表单
  addForm.addEventListener('submit', handleAddTodo)

  // 筛选按钮
  filterButtons.forEach((btn) => {
    btn.addEventListener('click', handleFilterChange)
  })

  // 编辑模态框
  modalClose.addEventListener('click', closeEditModal)
  cancelEdit.addEventListener('click', closeEditModal)
  editForm.addEventListener('submit', handleEditTodo)

  // 点击模态框背景关闭
  editModal.addEventListener('click', function (e) {
    if (e.target === editModal) {
      closeEditModal()
    }
  })

  // ESC 键关闭模态框
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && editModal.style.display !== 'none') {
      closeEditModal()
    }
  })

  // Enter 键快捷提交
  titleInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addForm.dispatchEvent(new Event('submit'))
    }
  })
}

// API 调用函数
async function apiCall(url, options = {}) {
  try {
    showLoading()
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: '请求失败' }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.status === 204 ? null : await response.json()
  } catch (error) {
    console.error('API 调用失败:', error)
    showMessage(error.message, 'error')
    throw error
  } finally {
    hideLoading()
  }
}

// 不显示全屏加载的 API 调用函数
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
      const errorData = await response.json().catch(() => ({ error: '请求失败' }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.status === 204 ? null : await response.json()
  } catch (error) {
    console.error('API 调用失败:', error)
    showMessage(error.message, 'error')
    throw error
  }
}

// 加载所有待办事项
async function loadTodos() {
  try {
    todos = await apiCall(API_BASE)
    renderTodos()
    updateStats()
  } catch (error) {
    console.error('加载待办事项失败:', error)
    // 显示空状态，让用户知道加载失败
    todosList.style.display = 'none'
    emptyState.style.display = 'block'
  }
}

// 添加待办事项
async function handleAddTodo(e) {
  e.preventDefault()

  const title = titleInput.value.trim()
  const description = descriptionInput.value.trim()

  // 客户端验证
  if (!title) {
    showMessage('请输入标题', 'error')
    titleInput.focus()
    return
  }

  if (title.length > 100) {
    showMessage('标题长度不能超过100个字符', 'error')
    titleInput.focus()
    return
  }

  if (description.length > 500) {
    showMessage('描述长度不能超过500个字符', 'error')
    descriptionInput.focus()
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

    // 乐观更新：立即添加到列表开头
    todos.unshift(newTodo)
    renderTodos()
    updateStats()

    // 清空表单
    addForm.reset()
    titleInput.focus() // 重新聚焦到标题输入框
    showMessage('待办事项添加成功！', 'success')
  } catch (error) {
    console.error('添加待办事项失败:', error)
  } finally {
    // 恢复按钮状态
    submitBtn.disabled = false
    submitBtn.innerHTML = originalText
  }
}

// 切换完成状态
async function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id)
  if (!todo) return

  // 立即更新 UI，提供即时反馈
  const index = todos.findIndex((t) => t.id === id)
  const originalTodo = { ...todos[index] }
  todos[index].completed = !todos[index].completed
  renderTodos()
  updateStats()

  try {
    const updatedTodo = await apiCallWithoutGlobalLoading(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: !originalTodo.completed }),
    })

    // 更新为服务器返回的数据
    todos[index] = updatedTodo
    renderTodos()
    updateStats()

    showMessage(updatedTodo.completed ? '任务已完成！' : '任务已标记为未完成', 'success')
  } catch (error) {
    // 如果失败，回滚到原始状态
    todos[index] = originalTodo
    renderTodos()
    updateStats()
    console.error('更新待办事项失败:', error)
  }
}

// 删除待办事项
async function deleteTodo(id) {
  if (!confirm('确定要删除这个待办事项吗？')) {
    return
  }

  // 找到要删除的待办事项
  const todoIndex = todos.findIndex((t) => t.id === id)
  if (todoIndex === -1) return

  const deletedTodo = todos[todoIndex]

  // 立即从 UI 中移除，提供即时反馈
  todos = todos.filter((t) => t.id !== id)
  renderTodos()
  updateStats()

  try {
    await apiCallWithoutGlobalLoading(`${API_BASE}/${id}`, {
      method: 'DELETE',
    })

    showMessage('待办事项已删除', 'success')
  } catch (error) {
    // 如果删除失败，恢复待办事项
    todos.splice(todoIndex, 0, deletedTodo)
    renderTodos()
    updateStats()
    console.error('删除待办事项失败:', error)
  }
}

// 打开编辑模态框
function openEditModal(id) {
  const todo = todos.find((t) => t.id === id)
  if (!todo) return

  editingTodoId = id
  editTitle.value = todo.title
  editDescription.value = todo.description
  editCompleted.checked = todo.completed

  editModal.style.display = 'flex'
  editTitle.focus()
}

// 关闭编辑模态框
function closeEditModal() {
  editModal.style.display = 'none'
  editingTodoId = null
  editForm.reset()
}

// 处理编辑表单提交
async function handleEditTodo(e) {
  e.preventDefault()

  if (!editingTodoId) return

  const title = editTitle.value.trim()
  const description = editDescription.value.trim()
  const completed = editCompleted.checked

  // 客户端验证
  if (!title) {
    showMessage('请输入待办事项标题', 'error')
    editTitle.focus()
    return
  }

  if (title.length > 100) {
    showMessage('标题长度不能超过100个字符', 'error')
    editTitle.focus()
    return
  }

  if (description.length > 500) {
    showMessage('描述长度不能超过500个字符', 'error')
    editDescription.focus()
    return
  }

  // 获取提交按钮，显示加载状态
  const submitBtn = editForm.querySelector('button[type="submit"]')
  const originalText = submitBtn.innerHTML

  try {
    // 设置按钮加载状态
    submitBtn.disabled = true
    submitBtn.innerHTML = '<span class="btn-spinner"></span>保存中...'

    const updatedTodo = await apiCallWithoutGlobalLoading(`${API_BASE}/${editingTodoId}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description, completed }),
    })

    // 更新本地数据
    const index = todos.findIndex((t) => t.id === editingTodoId)
    todos[index] = updatedTodo

    renderTodos()
    updateStats()
    closeEditModal()
    showMessage('待办事项更新成功！', 'success')
  } catch (error) {
    console.error('更新待办事项失败:', error)
  } finally {
    // 恢复按钮状态
    submitBtn.disabled = false
    submitBtn.innerHTML = originalText
  }
}

// 打开编辑模态框
function openEditModal(id) {
  const todo = todos.find((t) => t.id === id)
  if (!todo) return

  editingTodoId = id
  editTitle.value = todo.title
  editDescription.value = todo.description
  editCompleted.checked = todo.completed

  editModal.style.display = 'flex'
  editTitle.focus()
}

// 关闭编辑模态框
function closeEditModal() {
  editModal.style.display = 'none'
  editingTodoId = null
  editForm.reset()
}

// 处理编辑提交
async function handleEditTodo(e) {
  e.preventDefault()

  if (!editingTodoId) return

  const title = editTitle.value.trim()
  const description = editDescription.value.trim()
  const completed = editCompleted.checked

  if (!title) {
    showMessage('请输入标题', 'error')
    return
  }

  try {
    const updatedTodo = await apiCall(`${API_BASE}/${editingTodoId}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description, completed }),
    })

    const index = todos.findIndex((t) => t.id === editingTodoId)
    todos[index] = updatedTodo
    renderTodos()
    updateStats()
    closeEditModal()
    showMessage('待办事项更新成功！', 'success')
  } catch (error) {
    console.error('更新待办事项失败:', error)
  }
}

// 处理筛选变化
function handleFilterChange(e) {
  const filter = e.target.dataset.filter
  currentFilter = filter

  // 更新按钮状态
  filterButtons.forEach((btn) => btn.classList.remove('active'))
  e.target.classList.add('active')

  renderTodos()
}

// 渲染待办事项列表
function renderTodos() {
  const filteredTodos = getFilteredTodos()

  if (filteredTodos.length === 0) {
    todosList.style.display = 'none'
    emptyState.style.display = 'block'
    return
  }

  todosList.style.display = 'block'
  emptyState.style.display = 'none'

  todosList.innerHTML = filteredTodos
    .map(
      (todo) => `
        <article class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
            <div class="todo-content">
                <div class="todo-header">
                    <h3 class="todo-title">${escapeHtml(todo.title)}</h3>
                    <div class="todo-actions">
                        <button class="btn-icon" onclick="toggleTodo(${todo.id})" title="${
        todo.completed ? '标记为未完成' : '标记为已完成'
      }">
                            ${todo.completed ? '↩️' : '✅'}
                        </button>
                        <button class="btn-icon" onclick="openEditModal(${todo.id})" title="编辑">
                            ✏️
                        </button>
                        <button class="btn-icon btn-danger" onclick="deleteTodo(${
                          todo.id
                        })" title="删除">
                            🗑️
                        </button>
                    </div>
                </div>
                ${
                  todo.description
                    ? `<p class="todo-description">${escapeHtml(todo.description)}</p>`
                    : ''
                }
                <div class="todo-meta">
                    <span class="todo-date">创建于 ${formatDate(todo.created_at)}</span>
                    ${
                      todo.updated_at !== todo.created_at
                        ? `<span class="todo-date">更新于 ${formatDate(todo.updated_at)}</span>`
                        : ''
                    }
                </div>
            </div>
        </article>
    `
    )
    .join('')
}

// 获取筛选后的待办事项
function getFilteredTodos() {
  switch (currentFilter) {
    case 'completed':
      return todos.filter((todo) => todo.completed)
    case 'pending':
      return todos.filter((todo) => !todo.completed)
    default:
      return todos
  }
}

// 更新统计信息
function updateStats() {
  const total = todos.length
  const completed = todos.filter((todo) => todo.completed).length
  const pending = total - completed

  totalCount.textContent = total
  completedCount.textContent = completed
  pendingCount.textContent = pending
}

// 工具函数
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function showLoading() {
  loading.style.display = 'flex'
}

function hideLoading() {
  loading.style.display = 'none'
}

function showMessage(text, type = 'success') {
  message.textContent = text
  message.className = `message ${type}`
  message.style.display = 'block'

  setTimeout(() => {
    message.style.display = 'none'
  }, 3000)
}
