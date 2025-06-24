package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"go-todolist/handlers"
	"go-todolist/storage"
)

func main() {
	// 创建存储实例
	todoStorage := storage.NewMemoryStorage()

	// 创建处理器
	todoHandler := handlers.NewTodoHandler(todoStorage)

	// 设置路由
	mux := http.NewServeMux()

	// API 路由
	mux.Handle("/api/todos", todoHandler)
	mux.Handle("/api/todos/", todoHandler)

	// 静态文件服务
	fileServer := http.FileServer(http.Dir("./static/"))
	mux.Handle("/", fileServer)

	// 获取端口号
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// 启动服务器
	addr := ":" + port
	fmt.Printf("🚀 服务器启动成功！\n")
	fmt.Printf("📱 前端地址: http://localhost%s\n", addr)
	fmt.Printf("🔗 API 地址: http://localhost%s/api/todos\n", addr)
	fmt.Printf("⏹️  按 Ctrl+C 停止服务器\n\n")

	log.Fatal(http.ListenAndServe(addr, mux))
}
