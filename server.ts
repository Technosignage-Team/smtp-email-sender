import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy all .NET backend API routes — pipe raw body stream so no body is consumed.
  function proxyTo(targetHost: string, targetPort: number) {
    return (req: express.Request, res: express.Response) => {
      const options: http.RequestOptions = {
        hostname: targetHost,
        port: targetPort,
        path: req.originalUrl,
        method: req.method,
        headers: { ...req.headers, host: `${targetHost}:${targetPort}` },
      };
      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on("error", () => res.status(502).json({ error: "Backend unreachable" }));
      req.pipe(proxyReq);
    };
  }

  const BACKEND_HOST = (process.env.VITE_API_TARGET || "http://localhost:5050")
    .replace(/^https?:\/\//, "").split(":")[0];
  const BACKEND_PORT = parseInt(
    (process.env.VITE_API_TARGET || "http://localhost:5050").split(":")[2] ?? "5050"
  );

  app.use("/api/email",   proxyTo(BACKEND_HOST, BACKEND_PORT));
  app.use("/api/apps",    proxyTo(BACKEND_HOST, BACKEND_PORT));
  app.use("/api/account", proxyTo(BACKEND_HOST, BACKEND_PORT));

  app.use(express.json());

  // API route for sending email
  app.post("/api/send-email", async (req, res) => {
    const { subject, body } = req.body;

    if (!subject || !body) {
      return res.status(400).json({ error: "Subject and body are required" });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: process.env.SMTP_TO,
        subject: subject,
        text: body,
        html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
      });

      console.log("Message sent: %s", info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
