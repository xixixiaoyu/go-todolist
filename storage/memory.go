package storage

import (
	"errors"
	"sync"
	"time"

	"go-todolist/models"
)

var (
	ErrTodoNotFound = errors.New("待办事项未找到")
)

// MemoryStorage 内存存储实现
type MemoryStorage struct {
	todos  map[int]*models.Todo
	nextID int
	mutex  sync.RWMutex
}

// NewMemoryStorage 创建新的内存存储实例
func NewMemoryStorage() *MemoryStorage {
	return &MemoryStorage{
		todos:  make(map[int]*models.Todo),
		nextID: 1,
	}
}

// GetAll 获取所有待办事项
func (s *MemoryStorage) GetAll() ([]*models.Todo, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	todos := make([]*models.Todo, 0, len(s.todos))
	for _, todo := range s.todos {
		todos = append(todos, todo)
	}
	return todos, nil
}

// GetByID 根据ID获取待办事项
func (s *MemoryStorage) GetByID(id int) (*models.Todo, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	todo, exists := s.todos[id]
	if !exists {
		return nil, ErrTodoNotFound
	}
	return todo, nil
}

// Create 创建新的待办事项
func (s *MemoryStorage) Create(req *models.CreateTodoRequest) (*models.Todo, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	now := time.Now()
	todo := &models.Todo{
		ID:          s.nextID,
		Title:       req.Title,
		Description: req.Description,
		Completed:   false,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	s.todos[s.nextID] = todo
	s.nextID++

	return todo, nil
}

// Update 更新待办事项
func (s *MemoryStorage) Update(id int, req *models.UpdateTodoRequest) (*models.Todo, error) {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	todo, exists := s.todos[id]
	if !exists {
		return nil, ErrTodoNotFound
	}

	// 更新字段
	if req.Title != nil {
		todo.Title = *req.Title
	}
	if req.Description != nil {
		todo.Description = *req.Description
	}
	if req.Completed != nil {
		todo.Completed = *req.Completed
	}
	todo.UpdatedAt = time.Now()

	return todo, nil
}

// Delete 删除待办事项
func (s *MemoryStorage) Delete(id int) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if _, exists := s.todos[id]; !exists {
		return ErrTodoNotFound
	}

	delete(s.todos, id)
	return nil
}

// TodoStorage 定义存储接口
type TodoStorage interface {
	GetAll() ([]*models.Todo, error)
	GetByID(id int) (*models.Todo, error)
	Create(req *models.CreateTodoRequest) (*models.Todo, error)
	Update(id int, req *models.UpdateTodoRequest) (*models.Todo, error)
	Delete(id int) error
}
