export const eventStatus = (startDate: Date, endDate: Date) => {
  const now = new Date();

  if (now < startDate) {
    return "upcoming";
  } else if (now >= startDate && now <= endDate) {
    return "ongoing";
  } else {
    return "completed";
  }
};

export const generateTransactionId = (eventId: string, userId: string) => {
  const randomStr = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestamp = Date.now();
  return `TXN_${randomStr}_${eventId}_${userId}_${timestamp}`;
};
