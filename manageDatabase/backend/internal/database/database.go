package database

import (
	"database/sql"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"log"
)

func CreateDatabase(dsn string, dbName string) error {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("连接数据库失败: %v", err)
	}
	defer db.Close()
	sql := fmt.Sprintf("CREATE DATABASE IF NOT EXISTS `%s` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;", dbName)
	_, err = db.Exec(sql)
	if err != nil {
		return fmt.Errorf("创建数据库失败: %v", err)
	}

	log.Printf("数据库 %s 创建成功", dbName)
	return nil
}

func ListDatabases(dsn string) ([]string, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("连接数据库失败: %v", err)
	}
	defer db.Close()
	rows, err := db.Query("SHOW DATABASES")
	if err != nil {
		return nil, fmt.Errorf("查询数据库列表失败: %v", err)
	}
	defer rows.Close()
	var databases []string
	for rows.Next() {
		var dbName string
		if err := rows.Scan(&dbName); err != nil {
			return nil, fmt.Errorf("读取数据库名称失败: %v", err)
		}
		databases = append(databases, dbName)
	}

	return databases, nil
}
