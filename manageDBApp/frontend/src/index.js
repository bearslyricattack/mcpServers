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
        name: { type: "string", description: "Database cluster name" },
        namespace: { type: "string", description: "Deployment namespace", default: "default" },
        type: {
            type: "string",
            description: "Database type",
            enum: ["postgresql", "mysql", "redis", "mongodb"],
            default: "postgresql"
        },
        kubeconfig: {
            type: "string",
            description: "user kubeconfig.",
            default: ""
        }
    };
    return {
        tools: [
            {
                name: "create_database",
                description: "Create a new database cluster. Only supports MySQL，PostgreSQL，MongoDB and Redis.",
                inputSchema: {
                    type: "object",
                    properties: Object.assign({}, commonProperties),
                    required: ["name", "type", "namespace", "kubeconfig"]
                }
            },
            {
                name: "get_database_clusters",
                description: "Get a list of database clusters in the specified namespace.",
                inputSchema: {
                    type: "object",
                    properties: {
                        namespace: { type: "string", description: "Namespace to query", default: "default" },
                        kubeconfig: { type: "string", description: "user kubeconfig.", default: "" }
                    },
                    required: ["kubeconfig", "namespace"]
                }
            },
            {
                name: "get_database_connection",
                description: "Get the connection information for the specified database cluster.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Database cluster name" },
                        namespace: { type: "string", description: "Deployment namespace", default: "default" },
                        kubeconfig: { type: "string", description: "user kubeconfig.", default: "" }
                    },
                    required: ["name", "namespace", "kubeconfig"]
                }
            },
            {
                name: "delete_database",
                description: "Delete the specified database cluster.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Database cluster name" },
                        namespace: { type: "string", description: "Deployment namespace", default: "default" },
                        kubeconfig: { type: "string", description: "user kubeconfig.", default: "" }
                    },
                    required: ["name", "namespace", "kubeconfig"]
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
        const { namespace, kubeconfig } = args;
        const result = yield httpRequest(`${API_BASE_URL}/list`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, JSON.stringify({ namespace, kubeconfig }));
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
    throw new Error(`Unknown tool: ${request.params.name}`);
}));
function runServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.error("Database management server starting...");
            const transport = new stdio_js_1.StdioServerTransport();
            yield server.connect(transport);
            console.error("Server connected, waiting for requests...");
        }
        catch (err) {
            console.error("Server startup error:", err);
            process.exit(1);
        }
    });
}
// Start the server directly
// Avoid using import.meta.url since it is not supported when compiled to CommonJS
runServer();
