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

export const getImageUrl = (gender: string, username: string) => {
  if (gender === "Male")
    return `https://avatar.iran.liara.run/public/boy?username=${username}`;
  if (gender === "Female")
    return `https://avatar.iran.liara.run/public/girl?username=${username}`;
  return `https://avatar.iran.liara.run/username?username=${username}&length=1`;
};

