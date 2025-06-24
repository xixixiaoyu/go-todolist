package models

import (
	"time"
)

// Todo 表示待办事项的数据模型
type Todo struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Completed   bool      `json:"completed"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateTodoRequest 表示创建待办事项的请求结构
type CreateTodoRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// UpdateTodoRequest 表示更新待办事项的请求结构
type UpdateTodoRequest struct {
	Title       *string `json:"title,omitempty"`
	Description *string `json:"description,omitempty"`
	Completed   *bool   `json:"completed,omitempty"`
}

// Validate 验证创建请求的有效性
func (req *CreateTodoRequest) Validate() error {
	if req.Title == "" {
		return &ValidationError{Field: "title", Message: "标题不能为空"}
	}
	if len(req.Title) > 100 {
		return &ValidationError{Field: "title", Message: "标题长度不能超过100个字符"}
	}
	if len(req.Description) > 500 {
		return &ValidationError{Field: "description", Message: "描述长度不能超过500个字符"}
	}
	return nil
}

// ValidationError 表示验证错误
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e *ValidationError) Error() string {
	return e.Message
}
