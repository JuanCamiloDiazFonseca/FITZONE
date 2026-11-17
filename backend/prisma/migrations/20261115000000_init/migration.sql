-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "document" VARCHAR(40) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(254) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "type" "PlanType" NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "plans_duration_days_positive" CHECK ("duration_days" > 0),
    CONSTRAINT "plans_price_nonnegative" CHECK ("price" >= 0),
    CONSTRAINT "plans_type_duration_match" CHECK (
        ("type" = 'MONTHLY' AND "duration_days" = 30) OR
        ("type" = 'QUARTERLY' AND "duration_days" = 90) OR
        ("type" = 'SEMIANNUAL' AND "duration_days" = 180) OR
        ("type" = 'ANNUAL' AND "duration_days" = 365)
    )
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "start_date" TIMESTAMPTZ(3) NOT NULL,
    "expiration_date" TIMESTAMPTZ(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "memberships_amount_nonnegative" CHECK ("amount" >= 0),
    CONSTRAINT "memberships_expiration_after_start" CHECK ("expiration_date" > "start_date")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "paid_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0)
);

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_document_key" ON "users"("document");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "plans_type_key" ON "plans"("type");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE INDEX "memberships_plan_id_idx" ON "memberships"("plan_id");

-- CreateIndex
CREATE INDEX "memberships_status_expiration_date_idx" ON "memberships"("status", "expiration_date");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_id_user_id_key" ON "memberships"("id", "user_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_membership_id_idx" ON "payments"("membership_id");

-- CreateIndex
CREATE INDEX "payments_paid_at_idx" ON "payments"("paid_at");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_membership_id_user_id_fkey" FOREIGN KEY ("membership_id", "user_id") REFERENCES "memberships"("id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
