import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initializeSocketIO } from "./src/lib/socket-io-server.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request", err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  // Initialize Socket.io server
  initializeSocketIO(server);

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(
      `✓ Server running at http://${hostname}:${port}`
    );
    console.log(
      `✓ Socket.io initialized and listening for connections`
    );
  });
});
