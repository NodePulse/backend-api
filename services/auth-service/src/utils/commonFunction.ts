export const getImageUrl = (gender: string, username: string) => {
  if (gender === "Male")
    return `https://avatar.iran.liara.run/public/boy?username=${username}`;
  if (gender === "Female")
    return `https://avatar.iran.liara.run/public/girl?username=${username}`;
  return `https://avatar.iran.liara.run/username?username=${username}&length=1`;
};

