import {
  checkEventRegistration,
  createEvent,
  eventRegister,
  getAllEvents,
  getEventAttendees,
  getEventById,
  getMyEvents,
} from "../controller/eventController.js";
import { protect } from "../../shared/middleware/authMiddleware.js";
import { Router } from "express";
import multer from "multer";

const eventRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

eventRouter.post(
  "/create",
  protect,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createEvent
);
eventRouter.get("/get", protect, getMyEvents);
eventRouter.get("/all", protect, getAllEvents);
eventRouter.get("/:id", protect, getEventById);
eventRouter.post("/:id/register", protect, eventRegister);
eventRouter.get("/:id/registered", protect, checkEventRegistration);
eventRouter.get("/:id/attendees", protect, getEventAttendees);

export default eventRouter;
