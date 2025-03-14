#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "http";

const API_BASE_URL = "http://localhost:8080/databases";

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
    dsn:{type: "string", description: "数据库连接的信息", default: "default" },
    name:{type:"string",description: "创建的database的名称", default: "default"}
  };

  return {
    tools: [
      {
        name: "create_database",
        description: "根据连接信息,连接到数据库,创建新的数据库中的database。",
        inputSchema: {
          type: "object",
          properties: {
            ...commonProperties
          },
          required: ["dsn","name"]
        }
      },
      {
        name: "get_databases",
        description: "根据连接信息,连接到数据库,获取指定数据库中的database集群列表。",
        inputSchema: {
          type: "object",
          properties: {
            ...commonProperties
          },
          required: ["dsn"]
        }
      },
    ],
  };
});


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "create_database") {
    const args = request.params.arguments as { 
      dsn: string; 
      name :string;
    };
    const { dsn,name} = args;
    const result = await httpRequest(
      `${API_BASE_URL}/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      JSON.stringify({ dsn,name})
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
  else if (request.params.name === "get_databases") {
    const args = request.params.arguments as { 
      dsn: string; 
    };
    const { dsn} = args;
    const result = await httpRequest(
      `${API_BASE_URL}/list`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      JSON.stringify({ dsn })
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
runServer();
