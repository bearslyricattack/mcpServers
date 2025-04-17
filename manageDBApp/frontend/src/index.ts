#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "http";

const API_BASE_URL = "https://jnduwblmnmrm.sealoshzh.site/databases";

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
  return {
    tools: [
      {
        name: "create_database",
        description: "Create a new database cluster. Only supports MySQL，PostgreSQL，MongoDB and Redis.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Database cluster name" },
            namespace: { type: "string", description: "Deployment namespace"},
            kubeconfig: {type: "string", description: "user kubeconfig."},
            type:{type:"string",description:"Database type,postgresql,mysql,redis,mongodb",default:"mysql"},
            cpu:  {type: "string",description:"Database cpu request,format is xx m",default: "1000m"},
            memory: {type:"string",description:"Database memory request,format is xx Mi",default: "1024Mi"},
            storage: {type:"string",description:"Database storage request,format is xx Gi",default:"3Gi"},
            version: {type:"string",description:"Database version"}
          },
          required: ["name", "namespace","kubeconfig"]
        }
      },
      {
        name: "get_database_clusters",
        description: "Get a list of database clusters in the specified namespace.",
        inputSchema: {
          type: "object",
          properties: {
            namespace: { type: "string", description: "Namespace to query", default: "default" },
            kubeconfig:{type: "string", description: "user kubeconfig.", default: ""}
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
            kubeconfig:{type: "string", description: "user kubeconfig.", default: ""}
          },
          required: ["name", "namespace","kubeconfig"]
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
            kubeconfig:{type: "string", description: "user kubeconfig.", default: ""}
          },
          required: ["name", "namespace","kubeconfig"]
        }
      }
    ],
  };
});


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "create_database") {
    const args = request.params.arguments as {
      name: string;
      namespace: string;
      kubeconfig: string;
      type?: string;
      cpu?: string;
      memory?: string;
      storage?: string;
      version?: string;
    };
    const body = Object.fromEntries(
        Object.entries(args).filter(([_, v]) => v !== undefined)
    );
    const result = await httpRequest(
        `${API_BASE_URL}/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        },
        JSON.stringify(body)
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
      kubeconfig: string;
    };
    const { namespace,kubeconfig } = args;

    const result = await httpRequest(
        `${API_BASE_URL}/list`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        },
        JSON.stringify({namespace,kubeconfig})
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