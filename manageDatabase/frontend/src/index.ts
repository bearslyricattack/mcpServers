#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "http";

const API_BASE_URL = "http://localhost:8080/databases";

// Generic HTTP request function
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

// Tool list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const commonProperties = {
    dsn: { type: "string", description: "Database connection information", default: "default" },
    name: { type: "string", description: "Name of the database to manage", default: "default" },
    type: {type: "string",description: "Type of the database,Only supports MySQL and PostgreSQL."}
  };
  return {
    tools: [
      {
        name: "create_database",
        description: "Connect to the database using the connection info and create a new database. Only supports MySQL and PostgreSQL.",
        inputSchema: {
          type: "object",
          properties: {
            ...commonProperties
          },
          required: ["dsn", "name"]
        }
      },
      {
        name: "get_databases",
        description: "Connect to the database using the connection info and retrieve the list of databases in the cluster. Only supports MySQL and PostgreSQL.",
        inputSchema: {
          type: "object",
          properties: {
            ...commonProperties
          },
          required: ["dsn"]
        }
      },
      {
        name: "delete_database",
        description: "Connect to the database using the connection info and delete the specified database. Only supports MySQL and PostgreSQL.",
        inputSchema: {
          type: "object",
          properties: {
            ...commonProperties
          },
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
            type: {type: "string",description: "Type of the database,Only supports MySQL and PostgreSQL."}
          },
          required: ["dsn", "sql"]
        }
      }
    ],
  };
});

// Tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "create_database") {
    const args = request.params.arguments as {
      dsn: string;
      name: string;
      type: string;
    };
    const { dsn, name, type } = args;
    const result = await httpRequest(
        `${API_BASE_URL}/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        },
        JSON.stringify({ dsn, name, type })
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
      type: string;
    };
    const { dsn, type } = args;
    const result = await httpRequest(
        `${API_BASE_URL}/list`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        },
        JSON.stringify({ dsn, type })
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
      dsn: string;
      type: string;
      name: string;
    };
    const { dsn, type,name} = args;
    const result = await httpRequest(
        `${API_BASE_URL}/delete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        },
        JSON.stringify({ dsn, type ,name})
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
  else if (request.params.name === "exec_sql") {
    const args = request.params.arguments as {
      dsn: string;
      type: string;
      sql: string;
    };
    const { dsn, type, sql} = args;
    const result = await httpRequest(
        `${API_BASE_URL}/exec`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        },
        JSON.stringify({ dsn, type ,sql})
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

// Server startup
async function runServer() {
  try {
    console.error("Database management server is starting...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Server connected and awaiting requests...");
  } catch (err) {
    console.error("Server startup error:", err);
    process.exit(1);
  }
}
runServer();