import express from "express";
import swaggerUI from "swagger-ui-express";
import { swaggerSpec } from "../config/authDocs.js";

const swaggerDocsRouter = express.Router();

swaggerDocsRouter.use(
  "/auth",
  swaggerUI.serve,
  swaggerUI.setup(swaggerSpec, { explorer: true })
);

export default swaggerDocsRouter;
