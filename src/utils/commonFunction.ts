export const eventStatus = (startDate: Date, endDate: Date) => {
    const now = new Date();

    if(now < startDate) {
        return "upcoming";
    } else if(now >= startDate && now <= endDate) {
        return "ongoing";
    } else {
        return "completed";
    }
}