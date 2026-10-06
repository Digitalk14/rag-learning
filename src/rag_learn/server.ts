import { createServer } from "node:http";
import { searchKnowledge } from "./advanced_rag_for_ai_agent.ts";

const PORT = 3000;

const server = createServer(async (req, res) => {
  // ============================================================
  // POST /search
  // ============================================================

  if (req.method === "POST" && req.url === "/search") {
    try {
      // --------------------------------------------------------
      // 1. Read request body
      // --------------------------------------------------------

      let body = "";

      for await (const chunk of req) {
        body += chunk;
      }

      const { query } = JSON.parse(body);

      // --------------------------------------------------------
      // 2. Validate input
      // --------------------------------------------------------

      if (typeof query !== "string" || !query.trim()) {
        res.writeHead(400, {
          "Content-Type": "application/json",
        });

        res.end(
          JSON.stringify({
            error: "query must be a non-empty string",
          }),
        );

        return;
      }

      // --------------------------------------------------------
      // 3. Run RAG
      // --------------------------------------------------------

      const result = await searchKnowledge(query);

      // --------------------------------------------------------
      // 4. Return result
      // --------------------------------------------------------

      res.writeHead(200, {
        "Content-Type": "application/json",
      });

      res.end(JSON.stringify(result));

      return;
    } catch (error) {
      console.error(error);

      res.writeHead(500, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          error: "Internal server error",
        }),
      );

      return;
    }
  }

  // ============================================================
  // 404
  // ============================================================

  res.writeHead(404, {
    "Content-Type": "application/json",
  });

  res.end(
    JSON.stringify({
      error: "Not found",
    }),
  );
});

server.listen(PORT, () => {
  console.log(`RAG server listening on http://localhost:${PORT}`);
});