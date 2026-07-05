import { Router, type IRouter } from "express";
import healthRouter from "./health";
import woundenceRouter from "./woundence";

const router: IRouter = Router();

router.use(healthRouter);
router.use(woundenceRouter);

export default router;
