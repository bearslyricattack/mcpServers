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
                    // 如果JSON解析失败，返回原始字符串作为对象
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
server.setRequestHandler(types_js_1.ListToolsRequestSchema, () => __awaiter(void 0, void 0, void 0, function* () {
    const commonProperties = {
        dsn: { type: "string", description: "数据库连接的信息", default: "default" },
        name: { type: "string", description: "创建的database的名称", default: "default" }
    };
    return {
        tools: [
            {
                name: "create_database",
                description: "根据连接信息,连接到数据库,创建新的数据库中的database。",
                inputSchema: {
                    type: "object",
                    properties: Object.assign({}, commonProperties),
                    required: ["dsn", "name"]
                }
            },
            {
                name: "get_databases",
                description: "根据连接信息,连接到数据库,获取指定数据库中的database集群列表。",
                inputSchema: {
                    type: "object",
                    properties: Object.assign({}, commonProperties),
                    required: ["dsn"]
                }
            },
        ],
    };
}));
server.setRequestHandler(types_js_1.CallToolRequestSchema, (request) => __awaiter(void 0, void 0, void 0, function* () {
    if (request.params.name === "create_database") {
        const args = request.params.arguments;
        const { dsn, name } = args;
        const result = yield httpRequest(`${API_BASE_URL}/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, JSON.stringify({ dsn, name }));
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
        const { dsn } = args;
        const result = yield httpRequest(`${API_BASE_URL}/list`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, JSON.stringify({ dsn }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    }
    throw new Error(`未知工具: ${request.params.name}`);
}));
function runServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.error("数据库管理服务器启动中...");
            const transport = new stdio_js_1.StdioServerTransport();
            yield server.connect(transport);
            console.error("服务器已连接，等待请求...");
        }
        catch (err) {
            console.error("服务器启动错误:", err);
            process.exit(1);
        }
    });
}
runServer();
