package handlers

import (
	"encoding/json"
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

// writeJSONResponse 写入JSON响应
func writeJSONResponse(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

// writeErrorResponse 写入错误响应
func writeErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	writeJSONResponse(w, statusCode, ErrorResponse{Error: message})
}

// ServeHTTP 实现http.Handler接口
func (h *TodoHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// 设置CORS头
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// 处理预检请求
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	// 解析路径
	path := strings.TrimPrefix(r.URL.Path, "/api/todos")
	
	switch {
	case path == "" || path == "/":
		// /api/todos
		switch r.Method {
		case http.MethodGet:
			h.handleGetTodos(w, r)
		case http.MethodPost:
			h.handleCreateTodo(w, r)
		default:
			writeErrorResponse(w, http.StatusMethodNotAllowed, "方法不允许")
		}
	case strings.HasPrefix(path, "/"):
		// /api/todos/{id}
		idStr := strings.TrimPrefix(path, "/")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			writeErrorResponse(w, http.StatusBadRequest, "无效的ID格式")
			return
		}

		switch r.Method {
		case http.MethodGet:
			h.handleGetTodo(w, r, id)
		case http.MethodPut:
			h.handleUpdateTodo(w, r, id)
		case http.MethodDelete:
			h.handleDeleteTodo(w, r, id)
		default:
			writeErrorResponse(w, http.StatusMethodNotAllowed, "方法不允许")
		}
	default:
		writeErrorResponse(w, http.StatusNotFound, "路径未找到")
	}
}

// handleGetTodos 处理获取所有待办事项
func (h *TodoHandler) handleGetTodos(w http.ResponseWriter, r *http.Request) {
	todos, err := h.storage.GetAll()
	if err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "获取待办事项失败")
		return
	}
	writeJSONResponse(w, http.StatusOK, todos)
}

// handleGetTodo 处理获取单个待办事项
func (h *TodoHandler) handleGetTodo(w http.ResponseWriter, r *http.Request, id int) {
	todo, err := h.storage.GetByID(id)
	if err == storage.ErrTodoNotFound {
		writeErrorResponse(w, http.StatusNotFound, "待办事项未找到")
		return
	}
	if err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "获取待办事项失败")
		return
	}
	writeJSONResponse(w, http.StatusOK, todo)
}

// handleCreateTodo 处理创建待办事项
func (h *TodoHandler) handleCreateTodo(w http.ResponseWriter, r *http.Request) {
	var req models.CreateTodoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "无效的JSON格式")
		return
	}

	if err := req.Validate(); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, err.Error())
		return
	}

	todo, err := h.storage.Create(&req)
	if err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "创建待办事项失败")
		return
	}

	writeJSONResponse(w, http.StatusCreated, todo)
}

// handleUpdateTodo 处理更新待办事项
func (h *TodoHandler) handleUpdateTodo(w http.ResponseWriter, r *http.Request, id int) {
	var req models.UpdateTodoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErrorResponse(w, http.StatusBadRequest, "无效的JSON格式")
		return
	}

	todo, err := h.storage.Update(id, &req)
	if err == storage.ErrTodoNotFound {
		writeErrorResponse(w, http.StatusNotFound, "待办事项未找到")
		return
	}
	if err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "更新待办事项失败")
		return
	}

	writeJSONResponse(w, http.StatusOK, todo)
}

// handleDeleteTodo 处理删除待办事项
func (h *TodoHandler) handleDeleteTodo(w http.ResponseWriter, r *http.Request, id int) {
	err := h.storage.Delete(id)
	if err == storage.ErrTodoNotFound {
		writeErrorResponse(w, http.StatusNotFound, "待办事项未找到")
		return
	}
	if err != nil {
		writeErrorResponse(w, http.StatusInternalServerError, "删除待办事项失败")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
