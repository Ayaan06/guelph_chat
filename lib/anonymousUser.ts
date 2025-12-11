import { prisma } from "./prisma";

export const ANONYMOUS_USER = {
  id: "anonymous-public-user",
  email: "anonymous@guelph.chat",
  name: "Anonymous",
};

export async function ensureAnonymousUser() {
  return prisma.user.upsert({
    where: { email: ANONYMOUS_USER.email },
    update: { name: ANONYMOUS_USER.name },
    create: {
      id: ANONYMOUS_USER.id,
      email: ANONYMOUS_USER.email,
      name: ANONYMOUS_USER.name,
    },
  });
}
