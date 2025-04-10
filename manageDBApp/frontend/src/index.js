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
const API_BASE_URL = "http://192.168.10.33:31853/databases";
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
                    reject(error);
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
        name: { type: "string", description: "数据库集群名称" },
        namespace: { type: "string", description: "部署的命名空间", default: "default" },
        type: {
            type: "string",
            description: "数据库类型",
            enum: ["postgresql", "mysql", "redis", "mongodb", "kafka", "milvus"],
            default: "postgresql"
        }
    };
    return {
        tools: [
            {
                name: "create_database",
                description: "创建新的数据库集群。",
                inputSchema: {
                    type: "object",
                    properties: Object.assign({}, commonProperties),
                    required: ["name", "type", "namespace"]
                }
            },
            {
                name: "get_database_clusters",
                description: "获取指定命名空间中的数据库集群列表。",
                inputSchema: {
                    type: "object",
                    properties: {
                        namespace: { type: "string", description: "要查询的命名空间", default: "default" },
                        type: {
                            type: "string",
                            description: "数据库类型（可选）",
                            enum: ["postgresql", "mysql", "redis"]
                        }
                    }
                }
            },
            {
                name: "get_database_connection",
                description: "获取指定数据库集群的连接信息。",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "数据库集群名称" },
                        namespace: { type: "string", description: "部署的命名空间", default: "default" }
                    },
                    required: ["name", "namespace"]
                }
            },
            {
                name: "delete_database",
                description: "删除指定的数据库集群。",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "数据库集群名称" },
                        namespace: { type: "string", description: "部署的命名空间", default: "default" }
                    },
                    required: ["name", "namespace"]
                }
            }
        ],
    };
}));
server.setRequestHandler(types_js_1.CallToolRequestSchema, (request) => __awaiter(void 0, void 0, void 0, function* () {
    if (request.params.name === "create_database") {
        const args = request.params.arguments;
        const { name, type, namespace, kubeconfig } = args;
        const result = yield httpRequest(`${API_BASE_URL}/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, JSON.stringify({ name, type, namespace, kubeconfig }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    }
    else if (request.params.name === "get_database_clusters") {
        const args = request.params.arguments;
        const { namespace, type, kubeconfig } = args;
        const result = yield httpRequest(`${API_BASE_URL}/list`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, JSON.stringify({ namespace, type, kubeconfig }));
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2)
                }
            ]
        };
    }
    else if (request.params.name === "get_database_connection") {
        const args = request.params.arguments;
        const { name, namespace, kubeconfig } = args;
        const result = yield httpRequest(`${API_BASE_URL}/connect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, JSON.stringify({ name, namespace, kubeconfig }));
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
        const { name, namespace, kubeconfig } = args;
        const result = yield httpRequest(`${API_BASE_URL}/delete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, JSON.stringify({ name, namespace, kubeconfig }));
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
// 使用直接调用方式启动服务器
// 避免使用 import.meta.url，因为它在编译到 CommonJS 时不支持
runServer();
