package database

import (
	"database/sql"
	"fmt"
	_ "github.com/go-sql-driver/mysql"
	"log"
	"strings"
)

// CreateDatabase creates a database if it does not exist.
// Supports both MySQL and PostgreSQL.
func CreateDatabase(driver, dsn, dbName string) error {
	// Basic validation to avoid SQL injection
	if strings.ContainsAny(dbName, " ;'\"") {
		return fmt.Errorf("invalid database name: %s", dbName)
	}
	// Connect to database server (without a specific DB selected)
	db, err := sql.Open(driver, dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to database server: %v", err)
	}
	defer db.Close()
	var createSQL string
	switch driver {
	case "mysql":
		createSQL = fmt.Sprintf(
			"CREATE DATABASE IF NOT EXISTS `%s` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;",
			dbName,
		)
	case "postgres":
		// Check if database already exists
		var exists bool
		checkSQL := "SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1);"
		err = db.QueryRow(checkSQL, dbName).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check database existence: %v", err)
		}
		if exists {
			log.Printf("Database %s already exists", dbName)
			return nil
		}
		// PostgreSQL CREATE DATABASE does not support IF NOT EXISTS before version 9.1+
		createSQL = fmt.Sprintf(`CREATE DATABASE "%s";`, dbName)
	default:
		return fmt.Errorf("unsupported driver: %s", driver)
	}
	log.Printf("Executing SQL: %s", createSQL)
	if _, err = db.Exec(createSQL); err != nil {
		return fmt.Errorf("failed to create database: %v", err)
	}
	log.Printf("Database %s created successfully", dbName)
	return nil
}

// ListDatabases returns a list of databases for MySQL or PostgreSQL based on the driver type.
func ListDatabases(driver, dsn string) ([]string, error) {
	// Connect to the database server (without selecting a specific database)
	db, err := sql.Open(driver, dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database server: %v", err)
	}
	defer db.Close()
	var query string
	switch driver {
	case "mysql":
		query = "SHOW DATABASES"
	case "postgres":
		// Exclude system templates (template0, template1) and postgres system DB
		query = `
			SELECT datname FROM pg_database
			WHERE datistemplate = false AND datname NOT IN ('postgres')
			ORDER BY datname;
		`
	default:
		return nil, fmt.Errorf("unsupported driver: %s", driver)
	}
	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query database list: %v", err)
	}
	defer rows.Close()

	var databases []string
	for rows.Next() {
		var dbName string
		if err := rows.Scan(&dbName); err != nil {
			return nil, fmt.Errorf("failed to scan database name: %v", err)
		}
		databases = append(databases, dbName)
	}
	return databases, nil
}

func DeleteDatabase(driver, dsn, dbName string) error {
	if strings.ContainsAny(dbName, " ;'\"") {
		return fmt.Errorf("invalid database name: %s", dbName)
	}
	db, err := sql.Open(driver, dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to database server: %v", err)
	}
	defer db.Close()
	var dropSQL string
	switch driver {
	case "mysql":
		dropSQL = fmt.Sprintf("DROP DATABASE IF EXISTS `%s`", dbName)
	case "postgres":
		dropSQL = fmt.Sprintf(`DROP DATABASE IF EXISTS "%s"`, dbName)
	default:
		return fmt.Errorf("unsupported driver: %s", driver)
	}
	if _, err := db.Exec(dropSQL); err != nil {
		return fmt.Errorf("failed to drop database: %v", err)
	}
	return nil
}

func ExecSQL(driver, dsn, sqlStmt string) (string, error) {
	if strings.TrimSpace(sqlStmt) == "" {
		return "", fmt.Errorf("SQL statement is empty")
	}
	db, err := sql.Open(driver, dsn)
	if err != nil {
		return "", fmt.Errorf("failed to connect to database server: %v", err)
	}
	defer db.Close()
	res, err := db.Exec(sqlStmt)
	if err != nil {
		return "", fmt.Errorf("failed to execute SQL: %v", err)
	}
	affected, _ := res.RowsAffected()
	return fmt.Sprintf("%d rows affected", affected), nil
}
