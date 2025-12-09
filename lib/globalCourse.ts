import { prisma } from "./prisma";

export const GLOBAL_COURSE = {
  id: "global-chat",
  code: "GLOBAL",
  name: "Campus Chat",
  major: "All",
  level: 0,
};

export async function ensureGlobalCourseAndMembership(userId?: string) {
  const course = await prisma.course.upsert({
    where: { id: GLOBAL_COURSE.id },
    update: {},
    create: {
      id: GLOBAL_COURSE.id,
      code: GLOBAL_COURSE.code,
      name: GLOBAL_COURSE.name,
      major: GLOBAL_COURSE.major,
      level: GLOBAL_COURSE.level,
    },
  });

  if (userId) {
    await prisma.classMembership.upsert({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
      update: {},
      create: {
        userId,
        courseId: course.id,
      },
    });
  }

  return course;
}
