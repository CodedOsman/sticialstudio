// Simple seed to create a sample course structure
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const course = await prisma.course.create({
    data: {
      title: 'Arduino Basics',
      description: 'Introductory course to Arduino and basic hardware connections',
      modules: {
        create: [
          {
            title: 'Getting Started',
            lessons: {
              create: [{ title: 'Introduction', content: 'Welcome to Arduino!' }],
            },
          },
        ],
      },
    },
  })
  console.log('Seeded course:', course.title)
}

main()
  .catch((e) => {
    console.error(e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
