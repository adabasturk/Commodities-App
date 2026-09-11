import { Router, type IRouter } from "express";
import healthRouter from "./health";
import shipmentsRouter from "./shipments";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireAuth, shipmentsRouter);

export default router;
