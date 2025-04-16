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
    name: { type: "string", description: "Database cluster name" },
    namespace: { type: "string", description: "Deployment namespace", default: "default" },
    type: {
      type: "string",
      description: "Database type",
      enum: ["postgresql", "mysql", "redis", "mongodb", "kafka", "milvus"],
      default: "postgresql"
    }
  };

  return {
    tools: [
      {
        name: "create_database",
        description: "Create a new database cluster. Only supports MySQL，PostgreSQL，MongoDB and Redis.",
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
        description: "Get a list of database clusters in the specified namespace.",
        inputSchema: {
          type: "object",
          properties: {
            namespace: { type: "string", description: "Namespace to query", default: "default" },
            type: {
              type: "string",
              description: "Database type (optional)",
              enum: ["postgresql", "mysql", "redis"]
            }
          }
        }
      },
      {
        name: "get_database_connection",
        description: "Get the connection information for the specified database cluster.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Database cluster name" },
            namespace: { type: "string", description: "Deployment namespace", default: "default" }
          },
          required: ["name", "namespace"]
        }
      },
      {
        name: "delete_database",
        description: "Delete the specified database cluster.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Database cluster name" },
            namespace: { type: "string", description: "Deployment namespace", default: "default" }
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

  throw new Error(`Unknown tool: ${request.params.name}`);
});


async function runServer() {
  try {
    console.error("Database management server starting...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Server connected, waiting for requests...");
  } catch (err) {
    console.error("Server startup error:", err);
    process.exit(1);
  }
}

// Start the server directly
// Avoid using import.meta.url since it is not supported when compiled to CommonJS
runServer();