import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const now = new Date();
    try {
      // Capability detection lets the existing schema continue working without a migration.
      const columns = await this.prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'usuarios'
          AND column_name IN ('created_at', 'createdAt')
          AND data_type IN ('timestamp with time zone', 'timestamp without time zone')
        ORDER BY column_name LIMIT 1`;
      const column = columns[0]?.column_name;
      const registeredAt = column === 'created_at' ? Prisma.sql`u.created_at` : column === 'createdAt' ? Prisma.sql`u."createdAt"` : null;
      const newUsers = registeredAt ? Prisma.sql`(SELECT count(*) FROM usuarios u, bounds b WHERE ${registeredAt} >= b.month_start AND ${registeredAt} < b.next_month)` : Prisma.sql`NULL`;
      const missingDates = registeredAt ? Prisma.sql`(SELECT count(*) FROM usuarios u WHERE ${registeredAt} IS NULL)` : Prisma.sql`NULL`;

      // All aggregates and short lists below share one PostgreSQL statement/snapshot.
      // The month boundaries and grouping explicitly use Colombia, not the server timezone.
      const rows = await this.prisma.$queryRaw<{ dashboard: unknown }[]>(Prisma.sql`
        WITH ref AS (SELECT ${now}::timestamptz AS now), bounds AS (
          SELECT now,
            date_trunc('month', now AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota' AS month_start,
            (date_trunc('month', now AT TIME ZONE 'America/Bogota') + interval '1 month') AT TIME ZONE 'America/Bogota' AS next_month,
            (date_trunc('month', now AT TIME ZONE 'America/Bogota') - interval '1 month') AT TIME ZONE 'America/Bogota' AS previous_month,
            date_trunc('month', now AT TIME ZONE 'America/Bogota') AS local_month
          FROM ref
        ), membership_stats AS (
          SELECT
            count(*) FILTER (WHERE status = 'ACTIVE' AND expiration_date > b.now + interval '5 days') AS active,
            count(*) FILTER (WHERE status = 'ACTIVE' AND expiration_date >= b.now AND expiration_date <= b.now + interval '5 days') AS upcoming,
            count(*) FILTER (WHERE status = 'ACTIVE' AND expiration_date < b.now) AS expired
          FROM membresias CROSS JOIN bounds b
        ), revenue AS (
          SELECT coalesce(sum(amount),0) AS total,
            coalesce(sum(amount) FILTER (WHERE paid_at >= b.month_start AND paid_at < b.next_month),0) AS current,
            coalesce(sum(amount) FILTER (WHERE paid_at >= b.previous_month AND paid_at < b.month_start),0) AS previous,
            count(*) FILTER (WHERE paid_at >= b.previous_month AND paid_at < b.month_start) AS previous_count
          FROM pagos CROSS JOIN bounds b
        ), monthly AS (
          SELECT date_trunc('month', p.paid_at AT TIME ZONE 'America/Bogota') AS month,
            sum(p.amount) AS amount, count(*) AS payments
          FROM pagos p CROSS JOIN bounds b
          WHERE p.paid_at >= (b.local_month - interval '11 months') AT TIME ZONE 'America/Bogota' AND p.paid_at < b.next_month
          GROUP BY 1
        ), series AS (
          SELECT month FROM bounds b, LATERAL generate_series(b.local_month - interval '11 months', b.local_month, interval '1 month') month
        )
        SELECT json_build_object(
          'generatedAt', b.now, 'timeZone', 'America/Bogota', 'alertWindowDays', 5,
          'metrics', json_build_object(
            'totalUsers', (SELECT count(*) FROM usuarios),
            'activeMemberships', ms.active, 'upcomingMemberships', ms.upcoming, 'expiredMemberships', ms.expired,
            'totalRevenue', r.total::text, 'currentMonthRevenue', r.current::text,
            'newUsersThisMonth', ${newUsers}, 'usersWithoutRegistrationDate', ${missingDates},
            'registrationDatesAvailable', ${Boolean(registeredAt)}
          ),
          'comparison', json_build_object(
            'previousMonthRevenue', r.previous::text,
            'percentage', CASE WHEN r.previous_count > 0 AND r.previous > 0 THEN round((r.current-r.previous)/r.previous*100,2)::text ELSE NULL END,
            'basis', 'Mes en curso frente al mes anterior completo'
          ),
          'revenueByMonth', (SELECT coalesce(json_agg(json_build_object('month', to_char(s.month,'YYYY-MM'), 'amount', coalesce(m.amount,0)::text, 'payments', coalesce(m.payments,0)) ORDER BY s.month),'[]'::json) FROM series s LEFT JOIN monthly m ON m.month=s.month),
          'expiringMemberships', (SELECT coalesce(json_agg(item ORDER BY expiration_date,id),'[]'::json) FROM (
            SELECT m.id, m.expiration_date, json_build_object('id',m.id,'userName',u.name,'planType',p.type,'expirationDate',m.expiration_date) item
            FROM membresias m JOIN usuarios u ON u.id=m.user_id JOIN planes p ON p.id=m.plan_id
            WHERE m.status='ACTIVE' AND m.expiration_date >= b.now AND m.expiration_date <= b.now + interval '5 days'
            ORDER BY m.expiration_date,m.id LIMIT 6
          ) due),
          'users', (SELECT coalesce(json_agg(item ORDER BY name,id),'[]'::json) FROM (
            SELECT u.name,u.id,json_build_object('id',u.id,'name',u.name,'email',u.email,
              'membership', CASE WHEN m.id IS NULL THEN NULL ELSE json_build_object('id',m.id,'planType',p.type,'expirationDate',m.expiration_date,
                'status', CASE WHEN m.status='CANCELLED' THEN 'CANCELLED' WHEN m.expiration_date < b.now THEN 'EXPIRED' WHEN m.expiration_date <= b.now + interval '5 days' THEN 'UPCOMING' ELSE 'ACTIVE' END) END) item
            FROM (SELECT id,name,email FROM usuarios ORDER BY name,id LIMIT 4) u LEFT JOIN LATERAL (SELECT * FROM membresias WHERE user_id=u.id ORDER BY start_date DESC,id DESC LIMIT 1) m ON true
            LEFT JOIN planes p ON p.id=m.plan_id ORDER BY u.name,u.id LIMIT 4
          ) people),
          'recentPayments', (SELECT coalesce(json_agg(item ORDER BY paid_at DESC,id DESC),'[]'::json) FROM (
            SELECT p.paid_at,p.id,json_build_object('id',p.id,'userName',u.name,'planType',pl.type,'amount',p.amount::text,'paidAt',p.paid_at,'method',p.method) item
            FROM pagos p JOIN usuarios u ON u.id=p.user_id JOIN membresias m ON m.id=p.membership_id JOIN planes pl ON pl.id=m.plan_id
            ORDER BY p.paid_at DESC,p.id DESC LIMIT 4
          ) recent)
        ) AS dashboard
        FROM bounds b CROSS JOIN membership_stats ms CROSS JOIN revenue r
      `);
      return rows[0].dashboard;
    } catch {
      throw new InternalServerErrorException('No se pudo consultar el resumen del gimnasio.');
    }
  }
}
