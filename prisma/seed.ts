import { PrismaClient, Prisma } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const userData: Prisma.UserCreateInput[] = [
    {
        email: "admin@saloonneo.lk",
        firstName: "Admin",
        lastName: "neo",
        password: "$2a$12$m.dUBRELVi9eGfwiBJ7J3eoI3VvNxhypdx4ovj8xGO4beFlggZHt2",
        role: "ADMIN",
        status: "ACTIVE",
        privileges: []
    }
];

export async function main() {
  for (const u of userData) {
    await prisma.user.create({ data: u });
  }
}

main();