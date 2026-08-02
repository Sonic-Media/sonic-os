import { DEFAULT_APP_SETTINGS, DEFAULT_EXPENSE_TEMPLATES } from "../lib/constants";
import { DEFAULT_STAFF_ROLES } from "../lib/staff/roles";
import { getPrismaClient } from "../lib/db";
import { hashPassword } from "../lib/server/password";

const prisma = getPrismaClient();

const PRODUCTION_ROLES = [
  ...DEFAULT_STAFF_ROLES,
  {
    id: "owner",
    name: "Owner",
    description: "Full system ownership and administration.",
    modules: DEFAULT_STAFF_ROLES[0]?.modules ?? [],
    isDefault: true,
  },
  {
    id: "branch-manager",
    name: "Branch Manager",
    description: "Manage one branch across operations and staff.",
    modules: ["operations", "sales", "purchasing", "expenses", "stock", "staff", "reports"],
    isDefault: true,
  },
  {
    id: "admin",
    name: "Admin",
    description: "System administration and user management.",
    modules: DEFAULT_STAFF_ROLES[0]?.modules ?? [],
    isDefault: true,
  },
  {
    id: "inventory-officer",
    name: "Inventory Officer",
    description: "Manage stock, purchasing, and inventory movement.",
    modules: ["stock", "purchasing"],
    isDefault: true,
  },
] as const;

async function main() {
  for (const role of PRODUCTION_ROLES) {
    await prisma.role.upsert({
      where: { slug: role.id },
      update: {
        name: role.name,
        description: role.description,
        modules: [...role.modules],
        isSystem: true,
      },
      create: {
        slug: role.id,
        name: role.name,
        description: role.description,
        modules: [...role.modules],
        isSystem: true,
      },
    });
  }

  const branches = [
    {
      code: "kansanga",
      name: "Kansanga",
    },
    {
      code: "salaama",
      name: "Salaama",
    },
  ];

  const branchRecords = [];
  for (const branch of branches) {
    const record = await prisma.branch.upsert({
      where: { code: branch.code },
      update: { name: branch.name, active: true },
      create: {
        code: branch.code,
        name: branch.name,
        active: true,
      },
    });
    branchRecords.push(record);
  }

  await prisma.appSetting.upsert({
    where: { id: "default" },
    update: {
      businessName: DEFAULT_APP_SETTINGS.businessName,
      ownerName: DEFAULT_APP_SETTINGS.ownerName,
      branchNames: DEFAULT_APP_SETTINGS.branchNames,
      defaultLunchAmount: DEFAULT_APP_SETTINGS.defaultLunchAmount,
    },
    create: {
      id: "default",
      businessName: DEFAULT_APP_SETTINGS.businessName,
      ownerName: DEFAULT_APP_SETTINGS.ownerName,
      branchNames: DEFAULT_APP_SETTINGS.branchNames,
      defaultLunchAmount: DEFAULT_APP_SETTINGS.defaultLunchAmount,
    },
  });

  for (const template of DEFAULT_EXPENSE_TEMPLATES) {
    await prisma.expenseTemplate.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        category: template.category,
        defaultAmount: template.defaultAmount,
        active: template.active,
      },
      create: {
        id: template.id,
        name: template.name,
        category: template.category,
        defaultAmount: template.defaultAmount,
        active: template.active,
      },
    });
  }

  const ownerRole = await prisma.role.findUniqueOrThrow({
    where: { slug: "owner" },
  });
  const kansanga = branchRecords.find((branch) => branch.code === "kansanga");
  if (!kansanga) {
    throw new Error("Kansanga branch seed failed.");
  }

  const ownerPasswordHash = await hashPassword("owner");

  await prisma.user.upsert({
    where: { username: "owner" },
    update: {
      displayName: "Owner",
      passwordHash: ownerPasswordHash,
      roleId: ownerRole.id,
      branchId: kansanga.id,
      active: true,
    },
    create: {
      username: "owner",
      displayName: "Owner",
      passwordHash: ownerPasswordHash,
      roleId: ownerRole.id,
      branchId: kansanga.id,
      active: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
