import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import * as trpcExpress from "@trpc/server/adapters/express";
import { initDb } from "./src/backend/infrastructure/database";
import { appRouter } from "./src/backend/presentation/trpc/appRouter";
import { createContext, paymentRepository, notificationUseCase, issueTimelineRepository, issueUseCase } from "./src/backend/presentation/trpc/context";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 5001;

app.use(cors());
app.use(express.json());

// Mount tRPC Express Adapter
app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

import multer from "multer";
import fs from "fs";

// Create local uploads directory under public/uploads
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + fileExtension);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/heic",
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/ogg",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file format. Only images and videos are supported."));
    }
  },
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB limit
  },
});

// REST route for local file upload fallback
app.post("/api/upload/local", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

// Multer error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  // Initialize Database (CockroachDB or Fallback)
  await initDb();

  // Serve public/uploads statically with cache control headers
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "public", "uploads"), {
      maxAge: "365d",
      immutable: true,
    })
  );

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Start Payment Overdue Cron Job
  const OVERDUE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  async function runOverduePaymentCheck() {
    try {
      const overdue = await paymentRepository.findNewlyOverdue();
      for (const payment of overdue) {
        await paymentRepository.markOverdue(payment.id);
        
        const title = "Payment Overdue";
        const msg = `Payment for "${payment.id}" has not been authorized and is now overdue.`;
        
        // Notify contractor
        await notificationUseCase.createNotification(payment.contractorId, title, "Your payment is overdue.", payment.issueId, "payment");
        
        // Timeline event
        await issueTimelineRepository.create({
          id: `evt-${Date.now()}-${Math.floor(Math.random()*1000)}`,
          issueId: payment.issueId,
          title: "Payment Overdue",
          description: "Payment authority has not authorized payment within the allowed period.",
          createdAt: new Date().toISOString(),
          isSystem: true
        });
      }
    } catch (e) {
      console.error("Overdue check failed", e);
    }
  }

  runOverduePaymentCheck();
  setInterval(runOverduePaymentCheck, OVERDUE_CHECK_INTERVAL_MS);
}

startServer();

export type { AppRouter } from "./src/backend/presentation/trpc/appRouter";
export type { AppRouter as AppRouterType } from "./src/backend/presentation/trpc/appRouter";
