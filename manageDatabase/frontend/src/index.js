#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const http_1 = __importDefault(require("http"));
const API_BASE_URL = "http://localhost:8080/databases";
// Generic HTTP request function
function httpRequest(url, options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http_1.default.request(url, options, (res) => {
            let body = "";
            res.on("data", (chunk) => {
                body += chunk;
            });
            res.on("end", () => {
                try {
                    resolve(JSON.parse(body));
                }
                catch (error) {
                    // If JSON parsing fails, return raw string as object
                    resolve({ message: body });
                }
            });
        });
        req.on("error", (error) => reject(error));
        if (data) {
            req.write(data);
        }
        req.end();
    });
}
const server = new index_js_1.Server({
    name: "database-creator",
    version: "0.1.0",
}, {
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Tool list handler
server.setRequestHandler(types_js_1.ListToolsRequestSchema, () => __awaiter(void 0, void 0, void 0, function* () {
    const commonProperties = {
        dsn: { type: "string", description: "Database connection information", default: "default" },
        name: { type: "string", description: "Name of the database to manage", default: "default" },
        type: { type: "string", description: "Type of the database,Only supports MySQL and PostgreSQL." }
    };
    return {
        tools: [
            {
                name: "create_database",
                description: "Connect to the database using the connection info and create a new database. Only supports MySQL and PostgreSQL.",
                inputSchema: {
                    type: "object",
                    properties: Object.assign({}, commonProperties),
                    required: ["dsn", "name"]
                }
            },
            {
                name: "get_databases",
                description: "Connect to the database using the connection info and retrieve the list of databases in the cluster. Only supports MySQL and PostgreSQL.",
                inputSchema: {
                    type: "object",
                    properties: Object.assign({}, commonProperties),
                    required: ["dsn"]
                }
            },
            {
                name: "delete_database",
                description: "Connect to the database using the connection info and delete the specified database. Only supports MySQL and PostgreSQL.",
                inputSchema: {
                    type: "object",
                    properties: Object.assign({}, commonProperties),
                    required: ["dsn", "name"]
                }
            },
            {
                name: "exec_sql",
                description: "Execute a custom SQL statement on the connected database. Only supports MySQL and PostgreSQL.",
                inputSchema: {
                    type: "object",
                    properties: {
                        dsn: { type: "string", description: "Database connection information", default: "default" },
                        sql: { type: "string", description: "Custom SQL statement to execute", default: "SELECT 1" },
                        type: { type: "string", description: "Type of the database,Only supports MySQL and PostgreSQL." }
                    },
                    required: ["dsn", "sql"]
                }
            }
        ],
    };
}));
// Tool call handler
server.setRequestHandler(types_js_1.CallToolRequestSchema, (request) => __awaiter(void 0, void 0, void 0, function* () {
    if (request.params.name === "create_database") {
        const args = request.params.arguments;
        const { dsn, name, type } = args;
        const result = yield httpRequest(`${API_BASE_URL}/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, JSON.stringify({ dsn, name, type }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    }
    else if (request.params.name === "get_databases") {
        const args = request.params.arguments;
        const { dsn, type } = args;
        const result = yield httpRequest(`${API_BASE_URL}/list`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, JSON.stringify({ dsn, type }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    }
    else if (request.params.name === "delete_database") {
        const args = request.params.arguments;
        const { dsn, type, name } = args;
        const result = yield httpRequest(`${API_BASE_URL}/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, JSON.stringify({ dsn, type, name }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    }
    else if (request.params.name === "exec_sql") {
        const args = request.params.arguments;
        const { dsn, type, sql } = args;
        const result = yield httpRequest(`${API_BASE_URL}/exec`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, JSON.stringify({ dsn, type, sql }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
}));
// Server startup
function runServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.error("Database management server is starting...");
            const transport = new stdio_js_1.StdioServerTransport();
            yield server.connect(transport);
            console.error("Server connected and awaiting requests...");
        }
        catch (err) {
            console.error("Server startup error:", err);
            process.exit(1);
        }
    });
}
runServer();
