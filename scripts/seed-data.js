import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  Role,
  Priority,
  ActivityAction,
  NotificationType,
} from '@prisma/client';

function createPoolConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set before seeding the database.');
  }

  const url = new URL(databaseUrl);
  const hasPassword = Boolean(url.password);
  const isLocalHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

  if (!hasPassword && isLocalHost) {
    return {
      user: decodeURIComponent(url.username),
      database: decodeURIComponent(url.pathname.slice(1)),
    };
  }

  return { connectionString: databaseUrl };
}

const pool = new pg.Pool(createPoolConfig());
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ============================================================================
// SEED DEFINITIONS
// ============================================================================

const SEED_USERS = [
  // Super Admin
  {
    name: process.env.SUPER_ADMIN_NAME || 'Byten Super Admin',
    username: (process.env.SUPER_ADMIN_USERNAME || 'byten.in').trim().toLowerCase(),
    password: process.env.SUPER_ADMIN_PASSWORD || 'byten1234',
    role: Role.SUPER_ADMIN,
    isDeactivated: false,
  },
  // Admins
  {
    name: 'Sarah Chen',
    username: 'sarah.chen',
    password: 'password123',
    role: Role.ADMIN,
    isDeactivated: false,
  },
  {
    name: 'Marcus Vance',
    username: 'marcus.vance',
    password: 'password123',
    role: Role.ADMIN,
    isDeactivated: false,
  },
  // Managers
  {
    name: 'Elena Rostova',
    username: 'elena.rostova',
    password: 'password123',
    role: Role.MANAGER,
    isDeactivated: false,
  },
  {
    name: 'David Kim',
    username: 'david.kim',
    password: 'password123',
    role: Role.MANAGER,
    isDeactivated: false,
  },
  // Members
  {
    name: 'Alex Rivera',
    username: 'alex.rivera',
    password: 'password123',
    role: Role.MEMBER,
    isDeactivated: false,
  },
  {
    name: 'Priya Patel',
    username: 'priya.patel',
    password: 'password123',
    role: Role.MEMBER,
    isDeactivated: false,
  },
  // Deactivated Users (For showcasing Admin user restoration & filter view)
  {
    name: 'Jordan Lee',
    username: 'jordan.lee',
    password: 'password123',
    role: Role.MEMBER,
    isDeactivated: true,
  },
  {
    name: 'Claire Redfield',
    username: 'claire.redfield',
    password: 'password123',
    role: Role.MEMBER,
    isDeactivated: true,
  },
];

// 6 High-Impact Marketing Projects
const SEED_PROJECTS = [
  {
    key: 'cloud-infra',
    name: 'Cloud Native Infrastructure Modernization',
    description:
      'Transition core monolithic services into Kubernetes-managed containerized microservices with automated canary rollouts, PgBouncer clustering, and sub-second failovers.',
    createdBy: 'sarah.chen',
    lanes: [
      { name: 'Architecture & RFC', color: '#6366f1' },
      { name: 'Sprint Backlog', color: '#0ea5e9' },
      { name: 'In Development', color: '#f59e0b' },
      { name: 'Staging QA & Security', color: '#8b5cf6' },
      { name: 'Shipped to Production', color: '#10b981' },
    ],
    tags: [
      { name: 'Infrastructure', color: '#6366f1' },
      { name: 'Kubernetes', color: '#0ea5e9' },
      { name: 'Security', color: '#f43f5e' },
      { name: 'DevOps', color: '#8b5cf6' },
      { name: 'Performance', color: '#10b981' },
      { name: 'Database', color: '#f59e0b' },
    ],
  },
  {
    key: 'mobile-app',
    name: 'ByteFlow Mobile App 3.0 (iOS & Android)',
    description:
      'Next-generation native mobile application featuring offline-first local SQLite sync, real-time push events, customizable widget feeds, and haptic feedback gestures.',
    createdBy: 'marcus.vance',
    lanes: [
      { name: 'Design & UX Prototypes', color: '#ec4899' },
      { name: 'Sprint Backlog', color: '#0ea5e9' },
      { name: 'In Development', color: '#f59e0b' },
      { name: 'TestFlight / Internal Beta', color: '#8b5cf6' },
      { name: 'Released to App Store', color: '#10b981' },
    ],
    tags: [
      { name: 'Mobile', color: '#ec4899' },
      { name: 'iOS', color: '#6366f1' },
      { name: 'Android', color: '#10b981' },
      { name: 'UI/UX', color: '#f59e0b' },
      { name: 'v3.0 Release', color: '#8b5cf6' },
      { name: 'Offline Sync', color: '#0ea5e9' },
    ],
  },
  {
    key: 'ai-engine',
    name: 'AI Agent & Semantic Workflow Engine',
    description:
      'Autonomous agent system for task breakdown, LLM-powered context summaries, natural language Kanban query parsing, and vector knowledge base embeddings.',
    createdBy: 'elena.rostova',
    lanes: [
      { name: 'Prompt & Model R&D', color: '#6366f1' },
      { name: 'Active Engineering', color: '#f59e0b' },
      { name: 'Evaluation & Benchmarks', color: '#8b5cf6' },
      { name: 'Completed & Integrated', color: '#10b981' },
    ],
    tags: [
      { name: 'AI / LLM', color: '#8b5cf6' },
      { name: 'Vector DB', color: '#6366f1' },
      { name: 'Backend', color: '#0ea5e9' },
      { name: 'Feature', color: '#10b981' },
      { name: 'Research', color: '#ec4899' },
    ],
  },
  {
    key: 'soc2-security',
    name: 'SOC2 Type II & Security Hardening',
    description:
      'Enterprise-grade security controls, zero-trust RBAC audit log enforcement, vulnerability scanning pipeline, and automated compliance policy verification.',
    createdBy: 'sarah.chen',
    lanes: [
      { name: 'Audit Findings', color: '#f43f5e' },
      { name: 'Remediation In Progress', color: '#f59e0b' },
      { name: 'Compliance Verification', color: '#0ea5e9' },
      { name: 'Closed & Audited', color: '#10b981' },
    ],
    tags: [
      { name: 'SOC2', color: '#f43f5e' },
      { name: 'Security', color: '#e11d48' },
      { name: 'Compliance', color: '#8b5cf6' },
      { name: 'Critical', color: '#dc2626' },
      { name: 'Audit Log', color: '#0ea5e9' },
    ],
  },
  {
    key: 'design-system',
    name: 'Design System & Modern Component Library',
    description:
      'Modern UI/UX token overhaul, WCAG 2.1 AA accessibility compliance, glassmorphism card elevation, polished dark mode palette, and micro-interactions.',
    createdBy: 'elena.rostova',
    lanes: [
      { name: 'Ideation & Specs', color: '#64748b' },
      { name: 'Figma Components', color: '#ec4899' },
      { name: 'Component Implementation', color: '#f59e0b' },
      { name: 'Design Review & QA', color: '#8b5cf6' },
      { name: 'Published in v2.4', color: '#10b981' },
    ],
    tags: [
      { name: 'UI/UX', color: '#ec4899' },
      { name: 'Design System', color: '#8b5cf6' },
      { name: 'Accessibility', color: '#10b981' },
      { name: 'Frontend', color: '#0ea5e9' },
      { name: 'Animation', color: '#f59e0b' },
    ],
  },
  {
    key: 'growth-funnel',
    name: 'Customer Onboarding & Growth Funnel v2',
    description:
      'Redesigning team invitation workflows, interactive first-time setup checklist, self-serve plan upgrades, and mixpanel telemetry pipelines.',
    createdBy: 'marcus.vance',
    lanes: [
      { name: 'Backlog / Experiments', color: '#64748b' },
      { name: 'Active Sprint', color: '#f59e0b' },
      { name: 'A/B Testing in Staging', color: '#0ea5e9' },
      { name: 'Shipped to 100%', color: '#10b981' },
    ],
    tags: [
      { name: 'Growth', color: '#10b981' },
      { name: 'Onboarding', color: '#6366f1' },
      { name: 'Analytics', color: '#f59e0b' },
      { name: 'Full-Stack', color: '#0ea5e9' },
      { name: 'Conversion', color: '#ec4899' },
    ],
  },
];

// Helper to compute date relative to today
function relativeDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d;
}

// ============================================================================
// SEED RUNNER
// ============================================================================

async function seedMarketingData() {
  console.log('================================================================');
  console.log('🌊 BYTEFLOW MARKETING DATABASE SEEDING ENGINE');
  console.log('================================================================\n');

  console.log('🧹 [1/7] Cleaning existing workspace entities for fresh dataset...');
  // Clean down cascading dependencies
  await prisma.notification.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.cardTag.deleteMany({});
  await prisma.card.deleteMany({});
  await prisma.lane.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('👥 [2/7] Seeding Users with secure bcrypt credentials...');
  const userMap = new Map(); // username -> User entity
  const hashedPasswordDefault = await bcrypt.hash('password123', 10);
  const hashedPasswordSuperAdmin = await bcrypt.hash(
    process.env.SUPER_ADMIN_PASSWORD || 'byten1234',
    10
  );

  for (const u of SEED_USERS) {
    const passwordHash =
      u.role === Role.SUPER_ADMIN ? hashedPasswordSuperAdmin : hashedPasswordDefault;

    const user = await prisma.user.create({
      data: {
        name: u.name,
        username: u.username,
        role: u.role,
        password: passwordHash,
        isLocked: false,
        deletedAt: u.isDeactivated ? relativeDate(-30) : null,
        deletedBy: u.isDeactivated ? 'sarah.chen' : null,
      },
    });
    userMap.set(u.username, user);
    console.log(
      `   ✓ User created: @${user.username.padEnd(16)} (${user.name}) [${user.role}] ${
        u.isDeactivated ? '(Deactivated)' : '(Active)'
      }`
    );
  }

  console.log('\n📁 [3/7] Creating Projects, Custom Lanes, and Color Tags...');
  const projectMap = new Map(); // key -> { project, laneMap, tagMap }

  for (const projData of SEED_PROJECTS) {
    const creatorUser = userMap.get(projData.createdBy) || userMap.get('sarah.chen');

    // Create Project
    const project = await prisma.project.create({
      data: {
        name: projData.name,
        description: projData.description,
        createdBy: creatorUser?.username || 'byten.in',
      },
    });

    // Create Project Members (Assign active team members to project)
    for (const user of userMap.values()) {
      if (!user.deletedAt) {
        await prisma.projectMember.create({
          data: {
            projectId: project.id,
            userId: user.id,
          },
        });
      }
    }

    // Create Lanes
    const laneMap = new Map(); // laneName -> Lane entity
    let lanePos = 65536;
    for (const l of projData.lanes) {
      const lane = await prisma.lane.create({
        data: {
          projectId: project.id,
          name: l.name,
          color: l.color,
          position: lanePos,
          createdBy: creatorUser?.username,
        },
      });
      laneMap.set(l.name, lane);
      lanePos += 65536;
    }

    // Create Tags
    const tagMap = new Map(); // tagName -> Tag entity
    for (const t of projData.tags) {
      const tag = await prisma.tag.create({
        data: {
          projectId: project.id,
          name: t.name,
          color: t.color,
          createdBy: creatorUser?.username,
        },
      });
      tagMap.set(t.name, tag);
    }

    // Activity log for project creation
    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        performedBy: creatorUser?.name || 'Byten Super Admin',
        action: ActivityAction.CREATE_PROJECT,
        newValue: { name: project.name, description: project.description },
      },
    });

    projectMap.set(projData.key, { project, laneMap, tagMap });
    console.log(`   ✓ Project created: "${project.name}" with ${projData.lanes.length} lanes & ${projData.tags.length} tags`);
  }

  console.log('\n🗂️ [4/7] Flooding Kanban Boards with Rich Cards & Task Metadata...');

  // Helper to create card with tags, comments, and activity
  async function createRichCard({
    projectKey,
    laneName,
    title,
    description,
    priority,
    dueDateOffset,
    assigneeUsername,
    creatorUsername,
    tagNames = [],
    comments = [],
    activities = [],
  }) {
    const { project, laneMap, tagMap } = projectMap.get(projectKey);
    const lane = laneMap.get(laneName);
    if (!lane) throw new Error(`Lane "${laneName}" not found in project "${projectKey}"`);

    // Determine position in lane
    const cardCount = await prisma.card.count({ where: { laneId: lane.id } });
    const position = (cardCount + 1) * 65536;

    const card = await prisma.card.create({
      data: {
        projectId: project.id,
        laneId: lane.id,
        title,
        description,
        priority: priority || Priority.MEDIUM,
        dueDate: dueDateOffset !== undefined ? relativeDate(dueDateOffset) : null,
        assigneeId: assigneeUsername || null,
        createdBy: creatorUsername || 'sarah.chen',
        position,
      },
    });

    // Attach Tags
    for (const tName of tagNames) {
      const tag = tagMap.get(tName);
      if (tag) {
        await prisma.cardTag.create({
          data: { cardId: card.id, tagId: tag.id },
        });
      }
    }

    // Attach Comments
    for (const c of comments) {
      const commentAuthor = userMap.get(c.username);
      const createdComment = await prisma.comment.create({
        data: {
          cardId: card.id,
          comment: c.text,
          createdBy: commentAuthor?.name || c.username,
          createdAt: relativeDate(c.daysAgo ? -c.daysAgo : 0),
        },
      });

      // Comment Activity Log
      await prisma.activityLog.create({
        data: {
          projectId: project.id,
          cardId: card.id,
          commentId: createdComment.id,
          performedBy: commentAuthor?.name || c.username,
          action: ActivityAction.CREATE_COMMENT,
          newValue: { comment: c.text },
          createdAt: createdComment.createdAt,
        },
      });
    }

    // Additional Card Creation / Movement Activity Logs
    const creatorUser = userMap.get(creatorUsername) || userMap.get('sarah.chen');
    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        cardId: card.id,
        laneId: lane.id,
        performedBy: creatorUser?.name || 'Sarah Chen',
        action: ActivityAction.CREATE_CARD,
        newValue: {
          title: card.title,
          laneName: lane.name,
          priority: card.priority,
          assignee: card.assigneeId,
        },
      },
    });

    for (const act of activities) {
      const actUser = userMap.get(act.username) || creatorUser;
      await prisma.activityLog.create({
        data: {
          projectId: project.id,
          cardId: card.id,
          performedBy: actUser?.name || act.username,
          action: act.action,
          oldValue: act.oldValue || null,
          newValue: act.newValue || null,
          createdAt: act.daysAgo ? relativeDate(-act.daysAgo) : new Date(),
        },
      });
    }

    return card;
  }

  // --------------------------------------------------------------------------
  // PROJECT 1: Cloud Native Infrastructure Modernization
  // --------------------------------------------------------------------------
  await createRichCard({
    projectKey: 'cloud-infra',
    laneName: 'Architecture & RFC',
    title: 'RFC: Zero-Downtime PostgreSQL PgBouncer Read-Replica Cluster',
    description:
      '## Architecture Goals\n- Deploy HA PgBouncer connection pooling layer across 3 availability zones\n- Route analytical & reporting queries to dedicated read replicas\n- Enforce strict pool size ceilings to protect main PostgreSQL instance during peak bursts.',
    priority: Priority.HIGH,
    dueDateOffset: 4,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'sarah.chen',
    tagNames: ['Infrastructure', 'Database', 'Performance'],
    comments: [
      {
        username: 'sarah.chen',
        text: '@alex.rivera Please make sure we benchmark connection latency overhead with SSL verification enabled.',
        daysAgo: 2,
      },
      {
        username: 'alex.rivera',
        text: 'Benchmark complete! Added connection retry backoff in the connection pool adapter. P99 latency stayed under 1.2ms.',
        daysAgo: 1,
      },
    ],
  });

  await createRichCard({
    projectKey: 'cloud-infra',
    laneName: 'Architecture & RFC',
    title: 'Design distributed OpenTelemetry tracing for API gateway',
    description:
      'Standardize trace headers (W3C traceparent) across Express backend, Socket.IO gateway, and background worker queues.',
    priority: Priority.MEDIUM,
    dueDateOffset: 7,
    assigneeUsername: 'david.kim',
    creatorUsername: 'david.kim',
    tagNames: ['DevOps', 'Infrastructure'],
  });

  await createRichCard({
    projectKey: 'cloud-infra',
    laneName: 'Architecture & RFC',
    title: 'Evaluate Envoy Gateway vs Kong for API routing & rate-limiting',
    description:
      'Compare memory footprint, Wasm plugin capabilities, and sub-millisecond p99 proxy latency across high concurrency workloads.',
    priority: Priority.MEDIUM,
    dueDateOffset: 8,
    assigneeUsername: 'david.kim',
    creatorUsername: 'david.kim',
    tagNames: ['Infrastructure', 'Performance'],
  });

  await createRichCard({
    projectKey: 'cloud-infra',
    laneName: 'Sprint Backlog',
    title: 'Implement Terraform modules for EKS node group autoscaling',
    description:
      'Configure Karpenter provisioner for spot-instance lifecycle management with 40% cost reduction targets.',
    priority: Priority.HIGH,
    dueDateOffset: 3,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'sarah.chen',
    tagNames: ['Infrastructure', 'DevOps', 'Kubernetes'],
    comments: [
      {
        username: 'alex.rivera',
        text: 'Terraform configuration PR drafted. Ready for review @sarah.chen.',
        daysAgo: 1,
      },
    ],
  });

  await createRichCard({
    projectKey: 'cloud-infra',
    laneName: 'Sprint Backlog',
    title: 'Configure Grafana alerts for PostgreSQL replication lag (>500ms)',
    description:
      'Set up PagerDuty escalation policies and real-time Slack incident channel pings on DB replica lag spikes.',
    priority: Priority.HIGH,
    dueDateOffset: 2,
    assigneeUsername: 'david.kim',
    creatorUsername: 'sarah.chen',
    tagNames: ['DevOps', 'Database', 'Infrastructure'],
  });

  await createRichCard({
    projectKey: 'cloud-infra',
    laneName: 'In Development',
    title: 'Optimize Redis cache invalidation for Kanban realtime rooms',
    description:
      'Replace naive full-key purge with granular channel subscriptions keyed by `project:board:{projectId}` to prevent memory spikes.',
    priority: Priority.CRITICAL,
    dueDateOffset: 1,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'david.kim',
    tagNames: ['Performance', 'Infrastructure', 'Database'],
    comments: [
      {
        username: 'david.kim',
        text: '@alex.rivera let us run a 5,000 concurrent user websocket stress test on staging before promoting.',
        daysAgo: 1,
      },
      {
        username: 'alex.rivera',
        text: 'Ran the test with k6! Zero packet drops and event delivery was under 18ms across 50 project rooms.',
        daysAgo: 0,
      },
    ],
  });

  await createRichCard({
    projectKey: 'cloud-infra',
    laneName: 'In Development',
    title: 'Containerize background audit log worker with graceful shutdown',
    description:
      'Ensure SIGTERM handling flushes all pending database batch insertions before pod termination.',
    priority: Priority.MEDIUM,
    dueDateOffset: 2,
    assigneeUsername: 'david.kim',
    creatorUsername: 'sarah.chen',
    tagNames: ['Kubernetes', 'DevOps'],
  });

  await createRichCard({
    projectKey: 'cloud-infra',
    laneName: 'In Development',
    title: 'Benchmark gRPC connection multiplexing for internal microservices',
    description:
      'Evaluate HTTP/2 multiplexing throughput improvements versus standard REST JSON serialization.',
    priority: Priority.HIGH,
    dueDateOffset: 3,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'david.kim',
    tagNames: ['Performance', 'Infrastructure'],
  });

  await createRichCard({
    projectKey: 'cloud-infra',
    laneName: 'Staging QA & Security',
    title: 'mTLS certificate rotation automation between microservices',
    description:
      'Cert-manager automated renewal using Let\'s Encrypt internal CA with alerting for expiring certificates within 14 days.',
    priority: Priority.HIGH,
    dueDateOffset: 0, // Due today!
    assigneeUsername: 'sarah.chen',
    creatorUsername: 'sarah.chen',
    tagNames: ['Security', 'DevOps', 'Kubernetes'],
    comments: [
      {
        username: 'sarah.chen',
        text: 'All staging ingress certificates passed automated verification. Ready to sign off.',
        daysAgo: 0,
      },
    ],
  });

  await createRichCard({
    projectKey: 'cloud-infra',
    laneName: 'Staging QA & Security',
    title: 'Penetration testing on OAuth token revocation endpoints',
    description:
      'Verify immediate invalidation of refresh tokens on user password change or administrative account locking.',
    priority: Priority.CRITICAL,
    dueDateOffset: 1,
    assigneeUsername: 'sarah.chen',
    creatorUsername: 'sarah.chen',
    tagNames: ['Security', 'DevOps'],
  });

  await createRichCard({
    projectKey: 'cloud-infra',
    laneName: 'Shipped to Production',
    title: 'Multi-region Cloudflare Edge CDN & WAF rate-limiting',
    description:
      'Configured enterprise DDoS mitigation and custom bot protection rules on `/api/v1/auth` endpoints.',
    priority: Priority.CRITICAL,
    dueDateOffset: -5,
    assigneeUsername: 'david.kim',
    creatorUsername: 'sarah.chen',
    tagNames: ['Security', 'Infrastructure'],
    comments: [
      {
        username: 'sarah.chen',
        text: 'Deployed to production without any client disruption. Traffic latency improved by 35% globally.',
        daysAgo: 5,
      },
    ],
  });

  await createRichCard({
    projectKey: 'cloud-infra',
    laneName: 'Shipped to Production',
    title: 'Database connection pooling with Prisma pg adapter',
    description:
      'Migrated native client to `@prisma/adapter-pg` driver with pre-warmed connection pools.',
    priority: Priority.HIGH,
    dueDateOffset: -8,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'david.kim',
    tagNames: ['Database', 'Performance'],
  });

  // --------------------------------------------------------------------------
  // PROJECT 2: ByteFlow Mobile App 3.0 (iOS & Android)
  // --------------------------------------------------------------------------
  await createRichCard({
    projectKey: 'mobile-app',
    laneName: 'Design & UX Prototypes',
    title: 'Interactive prototype for swipe gesture card moves & lane shifts',
    description:
      'Design high-fidelity Framer/Figma interactive prototype with spring physics for card drag and drop on mobile viewports.',
    priority: Priority.HIGH,
    dueDateOffset: 5,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'marcus.vance',
    tagNames: ['UI/UX', 'Mobile', 'v3.0 Release'],
    comments: [
      {
        username: 'elena.rostova',
        text: '@priya.patel The 120Hz micro-haptics on iOS feel incredibly tactile! Great work on this curve.',
        daysAgo: 2,
      },
    ],
  });

  await createRichCard({
    projectKey: 'mobile-app',
    laneName: 'Design & UX Prototypes',
    title: 'Refine micro-animations for card completion confetti effect',
    description:
      'Subtle, satisfying particle physics animation when moving a task into the "Done" lane on iOS and Android.',
    priority: Priority.LOW,
    dueDateOffset: 4,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'elena.rostova',
    tagNames: ['UI/UX', 'Mobile'],
  });

  await createRichCard({
    projectKey: 'mobile-app',
    laneName: 'Sprint Backlog',
    title: 'Offline-first SQLite local replica engine with sync reconciliation',
    description:
      'Implement WatermelonDB/SQLite local caching layer with conflict resolution matrix for concurrent offline edits.',
    priority: Priority.CRITICAL,
    dueDateOffset: 3,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'marcus.vance',
    tagNames: ['Mobile', 'Offline Sync', 'iOS', 'Android'],
  });

  await createRichCard({
    projectKey: 'mobile-app',
    laneName: 'Sprint Backlog',
    title: 'Custom notification sound presets and notification channel groups',
    description:
      'Support distinct audio chimes for high-priority mentions versus regular project updates on Android 15.',
    priority: Priority.LOW,
    dueDateOffset: 6,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'marcus.vance',
    tagNames: ['Mobile', 'Android'],
  });

  await createRichCard({
    projectKey: 'mobile-app',
    laneName: 'In Development',
    title: 'Native APNS and FCM Push Notification Service Integration',
    description:
      'Deep link payload parsing for card mentions (@username) and project assignments directly into card modal drawer.',
    priority: Priority.HIGH,
    dueDateOffset: 2,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'marcus.vance',
    tagNames: ['Mobile', 'iOS', 'Android', 'v3.0 Release'],
    comments: [
      {
        username: 'marcus.vance',
        text: '@alex.rivera Ensure background notification refresh respects low-power mode on iOS 18.',
        daysAgo: 1,
      },
      {
        username: 'alex.rivera',
        text: 'Handled! Using background task scheduling APIs with battery-aware throttling.',
        daysAgo: 0,
      },
    ],
  });

  await createRichCard({
    projectKey: 'mobile-app',
    laneName: 'In Development',
    title: 'Biometric FaceID / Fingerprint Quick Unlock for Mobile Sessions',
    description:
      'Secure Enclave token storage for fast biometric authentication without re-typing password on mobile app launch.',
    priority: Priority.MEDIUM,
    dueDateOffset: 4,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'marcus.vance',
    tagNames: ['Mobile', 'iOS', 'Android'],
  });

  await createRichCard({
    projectKey: 'mobile-app',
    laneName: 'TestFlight / Internal Beta',
    title: 'Dark mode AMOLED OLED theme tuning & contrast audit',
    description:
      'Optimize true black `#000000` styling for OLED screens to improve battery life and reduce visual fatigue.',
    priority: Priority.LOW,
    dueDateOffset: -1, // Overdue by 1 day!
    assigneeUsername: 'priya.patel',
    creatorUsername: 'elena.rostova',
    tagNames: ['UI/UX', 'Mobile'],
  });

  await createRichCard({
    projectKey: 'mobile-app',
    laneName: 'TestFlight / Internal Beta',
    title: 'Validate gesture responsiveness across iPhone 16 Pro and Galaxy S24',
    description:
      'QA stress testing of multi-touch gesture handling and edge-swiping in landscape and portrait orientations.',
    priority: Priority.HIGH,
    dueDateOffset: 0,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'marcus.vance',
    tagNames: ['Mobile', 'v3.0 Release'],
  });

  await createRichCard({
    projectKey: 'mobile-app',
    laneName: 'Released to App Store',
    title: 'ByteFlow Mobile 2.8.0 Stability & Performance Patch',
    description:
      'Resolved websocket reconnection loop during cellular network handover in tunnels and elevators.',
    priority: Priority.MEDIUM,
    dueDateOffset: -12,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'marcus.vance',
    tagNames: ['Mobile', 'iOS', 'Android'],
  });

  // --------------------------------------------------------------------------
  // PROJECT 3: AI Agent & Semantic Workflow Engine
  // --------------------------------------------------------------------------
  await createRichCard({
    projectKey: 'ai-engine',
    laneName: 'Prompt & Model R&D',
    title: 'Context-window compression for 100+ task project summaries',
    description:
      'Benchmark hierarchical summarization using token-efficient tree-of-thought prompts to generate 1-paragraph executive updates.',
    priority: Priority.HIGH,
    dueDateOffset: 6,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'elena.rostova',
    tagNames: ['AI / LLM', 'Research'],
    comments: [
      {
        username: 'elena.rostova',
        text: 'Executive summary prompt accuracy reached 94% on test datasets. Ready to connect to admin dashboard API.',
        daysAgo: 1,
      },
    ],
  });

  await createRichCard({
    projectKey: 'ai-engine',
    laneName: 'Prompt & Model R&D',
    title: 'Prompt optimization for automated bug priority classification',
    description:
      'Train classifier to accurately assign LOW, MEDIUM, HIGH, or CRITICAL based on error logs and user bug reports.',
    priority: Priority.MEDIUM,
    dueDateOffset: 5,
    assigneeUsername: 'elena.rostova',
    creatorUsername: 'elena.rostova',
    tagNames: ['AI / LLM', 'Research'],
  });

  await createRichCard({
    projectKey: 'ai-engine',
    laneName: 'Active Engineering',
    title: 'Natural language Kanban filter query parser (e.g. "urgent tasks due this week")',
    description:
      'Build semantic parser translating unstructured search inputs into structured API parameters: `priority=CRITICAL&dueDateFilter=this_week`.',
    priority: Priority.CRITICAL,
    dueDateOffset: 2,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'elena.rostova',
    tagNames: ['AI / LLM', 'Backend', 'Feature'],
    comments: [
      {
        username: 'alex.rivera',
        text: '@priya.patel Check the schema parser unit tests. All 40 query permutation tests are passing.',
        daysAgo: 1,
      },
    ],
  });

  await createRichCard({
    projectKey: 'ai-engine',
    laneName: 'Active Engineering',
    title: 'Automated acceptance criteria generator from card title',
    description:
      'One-click AI button in Card Drawer to generate markdown checklist criteria based on project scope and existing cards.',
    priority: Priority.MEDIUM,
    dueDateOffset: 3,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'elena.rostova',
    tagNames: ['AI / LLM', 'Feature'],
  });

  await createRichCard({
    projectKey: 'ai-engine',
    laneName: 'Active Engineering',
    title: 'Implement rate limiting and token consumption quota per workspace',
    description:
      'Track cumulative monthly LLM token usage with warning thresholds at 80% and 95% capacity.',
    priority: Priority.HIGH,
    dueDateOffset: 1,
    assigneeUsername: 'david.kim',
    creatorUsername: 'elena.rostova',
    tagNames: ['Backend', 'AI / LLM'],
  });

  await createRichCard({
    projectKey: 'ai-engine',
    laneName: 'Evaluation & Benchmarks',
    title: 'Semantic vector similarity index for duplicate task detection',
    description:
      'Flag similar or duplicate cards in real-time when team members type new task titles to reduce duplicate work.',
    priority: Priority.HIGH,
    dueDateOffset: 1,
    assigneeUsername: 'david.kim',
    creatorUsername: 'elena.rostova',
    tagNames: ['Vector DB', 'AI / LLM', 'Backend'],
  });

  await createRichCard({
    projectKey: 'ai-engine',
    laneName: 'Completed & Integrated',
    title: 'Streaming LLM completion endpoint with Server-Sent Events',
    description:
      'Low-latency streaming responses for AI assistant drawer with token cancellation support on dialog close.',
    priority: Priority.HIGH,
    dueDateOffset: -4,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'elena.rostova',
    tagNames: ['AI / LLM', 'Backend', 'Feature'],
  });

  // --------------------------------------------------------------------------
  // PROJECT 4: SOC2 Type II & Security Hardening
  // --------------------------------------------------------------------------
  await createRichCard({
    projectKey: 'soc2-security',
    laneName: 'Audit Findings',
    title: 'Audit Report Finding SEC-042: Enforce password entropy and salt rounds',
    description:
      'Ensure all user password hashes utilize minimum 10 rounds of bcrypt and validate minimum 6 character length policies across API.',
    priority: Priority.HIGH,
    dueDateOffset: -2, // Overdue!
    assigneeUsername: 'sarah.chen',
    creatorUsername: 'sarah.chen',
    tagNames: ['SOC2', 'Security', 'Compliance'],
    comments: [
      {
        username: 'sarah.chen',
        text: '@sarah.chen This is required for our external audit review tomorrow. Please prioritize.',
        daysAgo: 2,
      },
      {
        username: 'sarah.chen',
        text: 'All authentication endpoints verified and patched. Unit tests validating entropy are passing.',
        daysAgo: 1,
      },
    ],
  });

  await createRichCard({
    projectKey: 'soc2-security',
    laneName: 'Audit Findings',
    title: 'Audit Finding SEC-051: Enforce session timeout after 15m inactivity',
    description:
      'Implement JWT token expiration and client-side idle tracking timer for administrative sessions.',
    priority: Priority.MEDIUM,
    dueDateOffset: 3,
    assigneeUsername: 'sarah.chen',
    creatorUsername: 'sarah.chen',
    tagNames: ['SOC2', 'Security', 'Compliance'],
  });

  await createRichCard({
    projectKey: 'soc2-security',
    laneName: 'Remediation In Progress',
    title: 'Implement immutable append-only Activity Log storage table',
    description:
      'Ensure no database user or API role can perform UPDATE or DELETE queries on `ActivityLog` table. Audit logs must be permanent.',
    priority: Priority.CRITICAL,
    dueDateOffset: 1,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'sarah.chen',
    tagNames: ['SOC2', 'Security', 'Audit Log', 'Critical'],
  });

  await createRichCard({
    projectKey: 'soc2-security',
    laneName: 'Compliance Verification',
    title: 'Automated Dependabot & Snyk Vulnerability Scanning in CI/CD',
    description:
      'Block pull request merges if high or critical CVE vulnerabilities are detected in npm dependencies.',
    priority: Priority.HIGH,
    dueDateOffset: 0, // Due today!
    assigneeUsername: 'david.kim',
    creatorUsername: 'sarah.chen',
    tagNames: ['SOC2', 'Compliance', 'Security'],
  });

  await createRichCard({
    projectKey: 'soc2-security',
    laneName: 'Closed & Audited',
    title: 'Zero-Trust Single Super Admin Enforcement Architecture',
    description:
      'Strict database and application-level constraint guaranteeing exactly one Super Administrator entity exists in the system.',
    priority: Priority.CRITICAL,
    dueDateOffset: -7,
    assigneeUsername: 'sarah.chen',
    creatorUsername: 'byten.in',
    tagNames: ['SOC2', 'Security', 'Compliance'],
    comments: [
      {
        username: 'byten.in',
        text: 'Verified single Super Admin governance invariant across all admin controller endpoints.',
        daysAgo: 7,
      },
    ],
  });

  // --------------------------------------------------------------------------
  // PROJECT 5: Design System & Modern Component Library
  // --------------------------------------------------------------------------
  await createRichCard({
    projectKey: 'design-system',
    laneName: 'Ideation & Specs',
    title: 'Spec: WCAG 2.1 AA Color Contrast Ratios for Status Badges',
    description:
      'Document minimum 4.5:1 contrast guidelines for all priority badges (Low, Medium, High, Critical) in both light and dark themes.',
    priority: Priority.MEDIUM,
    dueDateOffset: 4,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'elena.rostova',
    tagNames: ['Accessibility', 'UI/UX', 'Design System'],
  });

  await createRichCard({
    projectKey: 'design-system',
    laneName: 'Figma Components',
    title: 'Figma component library sync for Kanban Lane Cards & Drawers',
    description:
      'Align Figma auto-layout tokens, corner radius (8px / 12px), and typography scales with Tailwind CSS variables.',
    priority: Priority.HIGH,
    dueDateOffset: 2,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'elena.rostova',
    tagNames: ['Design System', 'UI/UX'],
    comments: [
      {
        username: 'priya.patel',
        text: '@priya.patel Imported the token variables into `globals.css`. The font scales look crisp!',
        daysAgo: 1,
      },
    ],
  });

  await createRichCard({
    projectKey: 'design-system',
    laneName: 'Component Implementation',
    title: 'Shadcn/Radix UI Dialog & Sheet animations with smooth spring easing',
    description:
      'Refine drawer entrance and exit animations with `framer-motion` style GPU-accelerated CSS keyframes.',
    priority: Priority.MEDIUM,
    dueDateOffset: 3,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'elena.rostova',
    tagNames: ['Frontend', 'Animation', 'Design System'],
  });

  await createRichCard({
    projectKey: 'design-system',
    laneName: 'Component Implementation',
    title: 'Build accessible keyboard navigation (Tab & Arrow keys) for Kanban',
    description:
      'Full WCAG AA keyboard navigability allowing users to tab between cards, press space to pick up, and arrow keys to move lanes.',
    priority: Priority.CRITICAL,
    dueDateOffset: 1,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'elena.rostova',
    tagNames: ['Accessibility', 'Frontend', 'Design System'],
  });

  await createRichCard({
    projectKey: 'design-system',
    laneName: 'Design Review & QA',
    title: 'Kanban drag-and-drop ghost card overlay styling',
    description:
      'Improve opacity, shadow elevation, and rotation tilt angle while dragging cards across lanes with `@dnd-kit`.',
    priority: Priority.HIGH,
    dueDateOffset: 1,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'elena.rostova',
    tagNames: ['Frontend', 'UI/UX', 'Animation'],
  });

  await createRichCard({
    projectKey: 'design-system',
    laneName: 'Published in v2.4',
    title: 'Unified Lucide React Iconography System across Navigation',
    description:
      'Replaced mixed icon sets with consistent 16px/20px Lucide stroke widths and neutral-tinted active states.',
    priority: Priority.LOW,
    dueDateOffset: -10,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'elena.rostova',
    tagNames: ['Design System', 'Frontend'],
  });

  // --------------------------------------------------------------------------
  // PROJECT 6: Customer Onboarding & Growth Funnel v2
  // --------------------------------------------------------------------------
  await createRichCard({
    projectKey: 'growth-funnel',
    laneName: 'Backlog / Experiments',
    title: 'Experiment: 3-step interactive onboarding checklist modal',
    description:
      'Display interactive progress checklist (1. Create First Project, 2. Invite Teammate, 3. Move First Card) for new signups.',
    priority: Priority.HIGH,
    dueDateOffset: 5,
    assigneeUsername: 'marcus.vance',
    creatorUsername: 'marcus.vance',
    tagNames: ['Growth', 'Onboarding', 'Conversion'],
  });

  await createRichCard({
    projectKey: 'growth-funnel',
    laneName: 'Active Sprint',
    title: 'Self-serve email invitation links with team role pre-assignment',
    description:
      'Generate secure one-time invite tokens allowing invited users to join directly into designated projects as Member or Manager.',
    priority: Priority.CRITICAL,
    dueDateOffset: 2,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'marcus.vance',
    tagNames: ['Full-Stack', 'Onboarding', 'Growth'],
    comments: [
      {
        username: 'marcus.vance',
        text: '@alex.rivera Let us make sure token expiry is 7 days and single-use only.',
        daysAgo: 1,
      },
    ],
  });

  await createRichCard({
    projectKey: 'growth-funnel',
    laneName: 'Active Sprint',
    title: 'Quick workspace switcher dropdown in main navigation header',
    description:
      'Seamless multi-organization switching with active organization state persistence in localStorage.',
    priority: Priority.HIGH,
    dueDateOffset: 2,
    assigneeUsername: 'alex.rivera',
    creatorUsername: 'marcus.vance',
    tagNames: ['Full-Stack', 'Growth'],
  });

  await createRichCard({
    projectKey: 'growth-funnel',
    laneName: 'A/B Testing in Staging',
    title: 'PostHog / Mixpanel telemetry events for Kanban interaction funnel',
    description:
      'Track `card_created`, `card_moved`, `comment_posted`, and `filter_applied` to measure feature engagement.',
    priority: Priority.MEDIUM,
    dueDateOffset: 1,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'marcus.vance',
    tagNames: ['Analytics', 'Growth'],
  });

  await createRichCard({
    projectKey: 'growth-funnel',
    laneName: 'Shipped to 100%',
    title: 'Redesigned public landing page with interactive Kanban preview',
    description:
      'High-converting modern landing page showcasing dark mode aesthetics, live demo cards, and role-based feature breakdown.',
    priority: Priority.HIGH,
    dueDateOffset: -6,
    assigneeUsername: 'priya.patel',
    creatorUsername: 'marcus.vance',
    tagNames: ['Growth', 'Conversion', 'Frontend'],
  });

  console.log('   ✓ Flooded 40+ cards across 6 boards with tags, comments, and activities.');

  console.log('\n🔔 [5/7] Generating Realistic Notifications for All Users...');

  const cloudProject = projectMap.get('cloud-infra').project;
  const mobileProject = projectMap.get('mobile-app').project;
  const aiProject = projectMap.get('ai-engine').project;
  const secProject = projectMap.get('soc2-security').project;

  const sampleNotifications = [
    // Super Admin Notifications
    {
      targetUsername: 'byten.in',
      senderUsername: 'sarah.chen',
      type: NotificationType.MENTION,
      title: 'Sarah Chen mentioned you',
      message: 'On "Zero-Trust Single Super Admin Enforcement": "Verified single Super Admin governance invariant across all endpoints."',
      projectId: secProject.id,
      isRead: false,
    },
    {
      targetUsername: 'byten.in',
      senderUsername: 'marcus.vance',
      type: NotificationType.ASSIGNED_TO_PROJECT,
      title: 'Added to project',
      message: 'Marcus Vance added you to "Customer Onboarding & Growth Funnel v2"',
      projectId: projectMap.get('growth-funnel').project.id,
      isRead: false,
    },
    {
      targetUsername: 'byten.in',
      senderUsername: 'sarah.chen',
      type: NotificationType.CARD_COMMENT,
      title: 'New comment on "Audit Report Finding SEC-042"',
      message: 'Sarah Chen: "All authentication endpoints verified and patched."',
      projectId: secProject.id,
      isRead: true,
    },
    // Sarah Chen Notifications
    {
      targetUsername: 'sarah.chen',
      senderUsername: 'alex.rivera',
      type: NotificationType.MENTION,
      title: 'Alex Rivera mentioned you',
      message: 'On "RFC: Zero-Downtime PostgreSQL": "Benchmark complete! Connection latency overhead is under 1.2ms."',
      projectId: cloudProject.id,
      isRead: false,
    },
    {
      targetUsername: 'sarah.chen',
      senderUsername: 'david.kim',
      type: NotificationType.CARD_COMMENT,
      title: 'New comment on "Implement Terraform modules for EKS"',
      message: 'David Kim: "Terraform configuration PR drafted. Ready for review @sarah.chen."',
      projectId: cloudProject.id,
      isRead: false,
    },
    {
      targetUsername: 'sarah.chen',
      senderUsername: 'alex.rivera',
      type: NotificationType.CARD_UPDATED,
      title: 'Task status updated',
      message: 'Alex Rivera moved "mTLS certificate rotation automation" to Staging QA & Security',
      projectId: cloudProject.id,
      isRead: true,
    },
    // Alex Rivera Notifications
    {
      targetUsername: 'alex.rivera',
      senderUsername: 'david.kim',
      type: NotificationType.MENTION,
      title: 'David Kim mentioned you',
      message: 'On "Optimize Redis cache invalidation": "@alex.rivera let us run a 5,000 concurrent user websocket stress test."',
      projectId: cloudProject.id,
      isRead: false,
    },
    {
      targetUsername: 'alex.rivera',
      senderUsername: 'sarah.chen',
      type: NotificationType.ASSIGNED_TO_CARD,
      title: 'Assigned to task',
      message: 'Sarah Chen assigned you to "Optimize Redis cache invalidation for Kanban realtime rooms"',
      projectId: cloudProject.id,
      isRead: false,
    },
    {
      targetUsername: 'alex.rivera',
      senderUsername: 'marcus.vance',
      type: NotificationType.ASSIGNED_TO_CARD,
      title: 'Assigned to task',
      message: 'Marcus Vance assigned you to "Self-serve email invitation links with team role pre-assignment"',
      projectId: projectMap.get('growth-funnel').project.id,
      isRead: true,
    },
    // Priya Patel Notifications
    {
      targetUsername: 'priya.patel',
      senderUsername: 'elena.rostova',
      type: NotificationType.MENTION,
      title: 'Elena Rostova mentioned you',
      message: 'On "Figma component library sync": "@priya.patel Check the updated dark mode tokens in globals.css."',
      projectId: projectMap.get('design-system').project.id,
      isRead: false,
    },
    {
      targetUsername: 'priya.patel',
      senderUsername: 'elena.rostova',
      type: NotificationType.ASSIGNED_TO_CARD,
      title: 'Assigned to task',
      message: 'Elena Rostova assigned you to "Context-window compression for 100+ task project summaries"',
      projectId: aiProject.id,
      isRead: false,
    },
    {
      targetUsername: 'priya.patel',
      senderUsername: 'alex.rivera',
      type: NotificationType.MENTION,
      title: 'Alex Rivera mentioned you',
      message: 'On "Natural language Kanban filter query parser": "@priya.patel Check the schema parser unit tests."',
      projectId: aiProject.id,
      isRead: true,
    },
  ];

  for (const notif of sampleNotifications) {
    const targetUser = userMap.get(notif.targetUsername);
    const senderUser = userMap.get(notif.senderUsername);
    if (targetUser) {
      await prisma.notification.create({
        data: {
          userId: targetUser.id,
          senderId: senderUser?.id || null,
          senderName: senderUser?.name || notif.senderUsername,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          projectId: notif.projectId || null,
          isRead: notif.isRead,
          createdAt: relativeDate(Math.floor(Math.random() * -3)),
        },
      });
    }
  }

  console.log(`   ✓ Created ${sampleNotifications.length} rich unread and read notifications.`);

  console.log('\n📊 [6/7] Synthesizing Global Platform Activity Stream...');

  const globalActivities = [
    {
      projectKey: 'cloud-infra',
      username: 'sarah.chen',
      action: ActivityAction.CREATE_LANE,
      newValue: { name: 'Shipped to Production', color: '#10b981' },
      daysAgo: 8,
    },
    {
      projectKey: 'cloud-infra',
      username: 'alex.rivera',
      action: ActivityAction.MOVE_CARD,
      newValue: { title: 'Database connection pooling with Prisma pg adapter', targetLaneName: 'Shipped to Production' },
      daysAgo: 8,
    },
    {
      projectKey: 'cloud-infra',
      username: 'david.kim',
      action: ActivityAction.CHANGE_PRIORITY,
      oldValue: { priority: 'HIGH' },
      newValue: { priority: 'CRITICAL', title: 'Multi-region Cloudflare Edge CDN & WAF rate-limiting' },
      daysAgo: 5,
    },
    {
      projectKey: 'mobile-app',
      username: 'marcus.vance',
      action: ActivityAction.CREATE_PROJECT,
      newValue: { name: 'ByteFlow Mobile App 3.0 (iOS & Android)' },
      daysAgo: 14,
    },
    {
      projectKey: 'mobile-app',
      username: 'priya.patel',
      action: ActivityAction.ADD_TAG_TO_CARD,
      newValue: { tagName: 'UI/UX', cardTitle: 'Interactive prototype for swipe gesture card moves & lane shifts' },
      daysAgo: 3,
    },
    {
      projectKey: 'ai-engine',
      username: 'elena.rostova',
      action: ActivityAction.CREATE_PROJECT,
      newValue: { name: 'AI Agent & Semantic Workflow Engine' },
      daysAgo: 10,
    },
    {
      projectKey: 'ai-engine',
      username: 'alex.rivera',
      action: ActivityAction.MOVE_CARD,
      newValue: { title: 'Streaming LLM completion endpoint with Server-Sent Events', targetLaneName: 'Completed & Integrated' },
      daysAgo: 4,
    },
    {
      projectKey: 'soc2-security',
      username: 'byten.in',
      action: ActivityAction.CREATE_PROJECT,
      newValue: { name: 'SOC2 Type II & Security Hardening' },
      daysAgo: 20,
    },
    {
      projectKey: 'soc2-security',
      username: 'sarah.chen',
      action: ActivityAction.MOVE_CARD,
      newValue: { title: 'Zero-Trust Single Super Admin Enforcement Architecture', targetLaneName: 'Closed & Audited' },
      daysAgo: 7,
    },
  ];

  for (const ga of globalActivities) {
    const { project } = projectMap.get(ga.projectKey);
    const user = userMap.get(ga.username);
    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        performedBy: user?.name || ga.username,
        action: ga.action,
        oldValue: ga.oldValue || null,
        newValue: ga.newValue || null,
        createdAt: relativeDate(-ga.daysAgo),
      },
    });
  }

  console.log('   ✓ Synthesized audit history stream.');

  console.log('\n📈 [7/7] Verifying seeded database counts...');
  const [uCount, pCount, lCount, cCount, tagCount, commCount, notifCount, actCount] =
    await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.lane.count({ where: { deletedAt: null } }),
      prisma.card.count({ where: { deletedAt: null } }),
      prisma.tag.count({ where: { deletedAt: null } }),
      prisma.comment.count({ where: { deletedAt: null } }),
      prisma.notification.count({}),
      prisma.activityLog.count({}),
    ]);

  console.log('================================================================');
  console.log('🎉 BYTEFLOW MARKETING SEED COMPLETED SUCCESSFULLY');
  console.log('================================================================');
  console.log(`   - Active Users:   ${uCount} (within 10-user capacity ceiling)`);
  console.log(`   - Projects:       ${pCount} high-impact marketing boards`);
  console.log(`   - Lanes:          ${lCount} custom colored workflow stages`);
  console.log(`   - Cards / Tasks:  ${cCount} rich cards with priorities & due dates`);
  console.log(`   - Tags:           ${tagCount} colorful categorizations`);
  console.log(`   - Comments:       ${commCount} collaborative discussions & @mentions`);
  console.log(`   - Notifications:  ${notifCount} unread & read alerts`);
  console.log(`   - Activity Logs:  ${actCount} audit events across timeline`);
  console.log('================================================================');
  console.log('🔑 QUICK LOGIN CREDENTIALS FOR SCREENSHOTS:');
  console.log('================================================================');
  console.log('   👑 Super Admin:   @byten.in        (Password: byten1234)');
  console.log('   🛡️  Admin:         @sarah.chen      (Password: password123)');
  console.log('   🛡️  Admin:         @marcus.vance    (Password: password123)');
  console.log('   💼 Manager:       @elena.rostova   (Password: password123)');
  console.log('   💼 Manager:       @david.kim       (Password: password123)');
  console.log('   👤 Member (Eng):   @alex.rivera     (Password: password123)');
  console.log('   👤 Member (UI):    @priya.patel     (Password: password123)');
  console.log('================================================================\n');
}

seedMarketingData()
  .catch((err) => {
    console.error('❌ Failed to seed marketing data:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
