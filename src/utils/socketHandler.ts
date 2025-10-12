import prisma from "@/config/prisma";
import { Server, Socket } from "socket.io";

interface ChatMessageData {
  text: string;
  eventId: string;
  isAnnouncement?: boolean; // Flag from the client
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}
const onlineUsers = new Map<string, Set<string>>();

export const initializeSocket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    // console.log(`✅ User connected: ${socket.id}`);

    // --- Handle joining a room ---
    socket.on("joinRoom", async (eventId: string, userId: string) => {
      socket.join(eventId);
      if (!onlineUsers.has(eventId)) {
        onlineUsers.set(eventId, new Set());
      }
      onlineUsers.get(eventId)?.add(userId);
      // console.log(`User ${socket.id} joined room ${eventId}`);
      io.to(eventId).emit("userStatus", {
        userId,
        isOnline: true,
      });

      try {
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: { organizerId: true },
        });

        const history = await prisma.chatMessage.findMany({
          where: { eventId },
          // take: ,
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: { id: true, name: true, image: true },
            },
          },
        });

        // MODIFIED: Ensure the isAnnouncement flag is sent with the history
        const formattedHistory = history.map((msg) => ({
          id: msg.id,
          text: msg.text,
          createdAt: msg.createdAt.toISOString(),
          isAnnouncement: msg.isAnnouncement,
          user: {
            id: msg.author.id,
            name: msg.author.name,
            avatarUrl: msg.author.image,
            // Assign role dynamically by comparing with the event's organizerId
            role: msg.author.id === event?.organizerId ? 'ORGANIZER' : 'PARTICIPANT',
          },
        }));
        
        socket.emit("chatHistory", formattedHistory);
        const currentOnlineUsers = Array.from(onlineUsers.get(eventId) || []);
        socket.emit("onlineUsers", currentOnlineUsers);
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    });

    // --- Handle sending a new message ---
    socket.on("sendMessage", async (data: ChatMessageData) => {
      try {
        // --- ADDED: Security Check to verify the user is the organizer ---
        const event = await prisma.event.findUnique({
          where: { id: data.eventId },
          select: { organizerId: true },
        });

        const isUserTheOrganizer = event?.organizerId === data.user.id;
        // Only allow an announcement if the user is the actual organizer
        const finalIsAnnouncement = data.isAnnouncement && isUserTheOrganizer;
        // ----------------------------------------------------------------

        // MODIFIED: Save the message with the verified announcement flag
        const newMessage = await prisma.chatMessage.create({
          data: {
            text: data.text,
            eventId: data.eventId,
            authorId: data.user.id,
            isAnnouncement: finalIsAnnouncement, // ADDED
          },
          include: {
            author: {
              select: { id: true, name: true, image: true },
            },
          },
        });

        // MODIFIED: Include the announcement flag in the broadcasted message
        const formattedMessage = {
          id: newMessage.id,
          text: newMessage.text,
          createdAt: newMessage.createdAt.toISOString(),
          isAnnouncement: newMessage.isAnnouncement, // ADDED
          user: {
            id: newMessage.author.id,
            name: newMessage.author.name,
            avatarUrl: newMessage.author.image,
          },
        };

        // Broadcast the new message to all users in the room
        io.to(data.eventId).emit("newMessage", formattedMessage);
      } catch (error) {
        console.error("Error saving message:", error);
      }
    });

    socket.on("disconnecting", () => {
      // Find all rooms the user was in
      const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);

      rooms.forEach((eventId) => {
        for (const [eId, users] of onlineUsers.entries()) {
          if (eId === eventId) {
            // You need to store userId in socket’s data
            const userId = (socket as any).userId;
            if (userId) {
              users.delete(userId);
              io.to(eventId).emit("userStatus", {
                userId,
                isOnline: false,
              });
            }
          }
        }
      });
    });

    // --- Handle user disconnection ---
    socket.on("disconnect", () => {
      console.log(`🔥 User disconnected: ${socket.id}`);
    });
  });
};
