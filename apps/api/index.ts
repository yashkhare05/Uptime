import express from "express"
import type { Request, Response } from "express"
import { authMiddleware } from "./middleware";
import { prismaClient } from "db/client";
import cors from "cors";
import { Transaction, SystemProgram, Connection } from "@solana/web3.js";
import { MonitoringService } from "./src/services/monitoring.service";

const connection = new Connection("https://api.mainnet-beta.solana.com");
const app = express();
const monitoringService = new MonitoringService();

app.use(cors());
app.use(express.json());

app.post("/api/v1/website", authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;
    const { url } = req.body;

    const data = await prismaClient.website.create({
        data: {
            userId,
            url,
            notificationEmail:"khareyash05@gmail.com"
        }
    });

    res.json({
        id: data.id
    });
});

app.get("/api/v1/website/status", authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const websiteId = req.query.websiteId! as unknown as string;
    const userId = req.userId;

    const data = await prismaClient.website.findFirst({
        where: {
            id: websiteId,
            userId,
            disabled: false
        },
        include: {
            ticks: true
        }
    });

    const latestTick = data?.ticks[0];
    if (latestTick) {
        await monitoringService.updateWebsiteStatus(
            websiteId,
            latestTick.status === 'Good' ? 'good' : 'bad'
        );
    }

    res.json(data);
});

app.get("/api/v1/websites", authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId!;

    const websites = await prismaClient.website.findMany({
        where: {
            userId,
            disabled: false
        },
        include: {
            ticks: true
        }
    });

    for (const website of websites) {
        const latestTick = website.ticks[0];
        if (latestTick) {
            await monitoringService.updateWebsiteStatus(
                website.id,
                latestTick.status === 'Good' ? 'good' : 'bad'
            );
        }
    }

    res.json({
        websites
    });
});

app.delete("/api/v1/website/", authMiddleware, async (req: Request, res: Response): Promise<void> => {
    const websiteId = req.body.websiteId;
    const userId = req.userId!;

    await prismaClient.website.update({
        where: {
            id: websiteId,
            userId
        },
        data: {
            disabled: true
        }
    });

    res.json({
        message: "Deleted website successfully"
    });
});

app.post("/api/v1/payout/:validatorId", async (req: Request, res: Response): Promise<void> => {
    // Implementation here
});

app.listen(8080);
