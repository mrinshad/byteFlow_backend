import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedSuperAdmin() {
  console.log('================================================================');
  console.log('👑 BYTEFLOW PRODUCTION SUPER ADMIN INITIALIZATION');
  console.log('================================================================\n');

  const adminName = process.env.SUPER_ADMIN_NAME || 'Byten Super Admin';
  const adminUsername = (process.env.SUPER_ADMIN_USERNAME || 'byten.in').trim().toLowerCase();
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'byten1234';

  if (!adminUsername) {
    console.error('❌ Error: SUPER_ADMIN_USERNAME cannot be empty.');
    process.exit(1);
  }

  if (adminPassword.length < 6) {
    console.error('❌ Error: SUPER_ADMIN_PASSWORD must be at least 6 characters.');
    process.exit(1);
  }

  // Check if a SUPER_ADMIN already exists in the database
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: Role.SUPER_ADMIN, deletedAt: null },
  });

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  if (existingSuperAdmin) {
    // If username is different, strictly BLOCK creating a second superadmin
    if (existingSuperAdmin.username !== adminUsername) {
      console.error(`\n❌ CREATION BLOCKED: A Super Administrator already exists (@${existingSuperAdmin.username}).`);
      console.error(`   The Super Administrator is a strict single entity in ByteFlow.`);
      console.error(`   Creating a new or secondary Super Administrator account is completely forbidden.\n`);
      process.exit(1);
    }

    console.log(`ℹ️  Super Administrator verified: @${existingSuperAdmin.username} (${existingSuperAdmin.name})`);
    console.log('   Updating credentials and ensuring role integrity...');

    const updated = await prisma.user.update({
      where: { id: existingSuperAdmin.id },
      data: {
        name: adminName,
        password: hashedPassword,
        role: Role.SUPER_ADMIN,
        isLocked: false,
        deletedAt: null,
      },
    });

    console.log(`\n✅ Super Administrator verified and updated:`);
    console.log(`   - Name:     ${updated.name}`);
    console.log(`   - Username: @${updated.username}`);
    console.log(`   - Role:     ${updated.role}`);
    console.log(`   - ID:       ${updated.id}\n`);
  } else {
    // Check if the target username is occupied by another non-superadmin user
    const existingUser = await prisma.user.findUnique({
      where: { username: adminUsername },
    });

    let superAdmin;
    if (existingUser) {
      console.log(`ℹ️  Setting existing user @${adminUsername} as the single Super Administrator...`);
      superAdmin = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: adminName,
          password: hashedPassword,
          role: Role.SUPER_ADMIN,
          isLocked: false,
          deletedAt: null,
        },
      });
    } else {
      console.log(`🚀 Creating initial single Super Administrator @${adminUsername}...`);
      superAdmin = await prisma.user.create({
        data: {
          name: adminName,
          username: adminUsername,
          password: hashedPassword,
          role: Role.SUPER_ADMIN,
          isLocked: false,
        },
      });
    }

    console.log(`\n🎉 Single Super Administrator created successfully:`);
    console.log(`   - Name:     ${superAdmin.name}`);
    console.log(`   - Username: @${superAdmin.username}`);
    console.log(`   - Role:     ${superAdmin.role}`);
    console.log(`   - ID:       ${superAdmin.id}\n`);
  }

  console.log('================================================================');
  console.log('🔒 Security: Single Super Administrator constraint is strictly active.');
  console.log('================================================================\n');
}

seedSuperAdmin()
  .catch((err) => {
    console.error('❌ Failed to initialize Super Admin:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
