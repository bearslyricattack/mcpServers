#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "http";

const API_BASE_URL = "http://192.168.10.33:31853/databases";

function httpRequest(
  url: string, 
  options: http.RequestOptions, 
  data: string | null = null
): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
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

const server = new Server(
  {
    name: "database-creator",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
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
          properties: {
            ...commonProperties
          },
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
});


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "create_database") {
    const args = request.params.arguments as { 
      name: string; 
      type: string; 
      namespace: string;
      kubeconfig: string;
    };
    const { name, type, namespace, kubeconfig } = args;
    
    const result = await httpRequest(
      `${API_BASE_URL}/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      JSON.stringify({ name, type, namespace, kubeconfig })
    );
    
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
    const args = request.params.arguments as { 
      namespace: string; 
      type?: string;
      kubeconfig: string;
    };
    const { namespace, type, kubeconfig } = args;

    const result = await httpRequest(
      `${API_BASE_URL}/list`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      JSON.stringify({ namespace, type, kubeconfig })
    );
    
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
    const args = request.params.arguments as {
      name: string;
      namespace: string;
      kubeconfig: string;
    };
    const { name, namespace, kubeconfig } = args;
    
    const result = await httpRequest(
      `${API_BASE_URL}/connect`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      JSON.stringify({ name, namespace, kubeconfig })
    );
    
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
    const args = request.params.arguments as {
      name: string;
      namespace: string;
      kubeconfig: string;
    };
    const { name, namespace, kubeconfig } = args;
    
    const result = await httpRequest(
      `${API_BASE_URL}/delete`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      JSON.stringify({ name, namespace, kubeconfig })
    );
    
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
});


async function runServer() {
  try {
    console.error("数据库管理服务器启动中...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("服务器已连接，等待请求...");
  } catch (err) {
    console.error("服务器启动错误:", err);
    process.exit(1);
  }
}

// 使用直接调用方式启动服务器
// 避免使用 import.meta.url，因为它在编译到 CommonJS 时不支持
runServer();
