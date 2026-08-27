--
-- PostgreSQL database dump
--

\restrict 1sZVPvZlJ3Qrs7BUVVP31Xgdrp24fbJGQsbVz3P5guYgyTP9NMoj9vsujM1IaWh

-- Dumped from database version 18.6 (3484359)
-- Dumped by pg_dump version 18.6 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ActivityLog; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ActivityLog" (
    id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ActivityLog" OWNER TO neondb_owner;

--
-- Name: AppSetting; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AppSetting" (
    id text DEFAULT 'default'::text NOT NULL,
    "businessName" text NOT NULL,
    "ownerName" text NOT NULL,
    "branchNames" jsonb NOT NULL,
    "defaultLunchAmount" integer DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AppSetting" OWNER TO neondb_owner;

--
-- Name: AuditLogEntry; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AuditLogEntry" (
    id uuid NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text NOT NULL,
    "userName" text NOT NULL,
    role text NOT NULL,
    "branchCode" text NOT NULL,
    action text NOT NULL,
    module text NOT NULL,
    "recordId" text,
    detail text,
    "oldValues" jsonb,
    "newValues" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLogEntry" OWNER TO neondb_owner;

--
-- Name: AuthAuditLog; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."AuthAuditLog" (
    id uuid NOT NULL,
    "userId" uuid NOT NULL,
    username text NOT NULL,
    "branchCode" text NOT NULL,
    action text NOT NULL,
    detail text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuthAuditLog" OWNER TO neondb_owner;

--
-- Name: Branch; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Branch" (
    id uuid NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    address text,
    phone text,
    manager text,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Branch" OWNER TO neondb_owner;

--
-- Name: Customer; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Customer" (
    id uuid NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Customer" OWNER TO neondb_owner;

--
-- Name: DailyOperation; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DailyOperation" (
    id uuid NOT NULL,
    date text NOT NULL,
    "time" text NOT NULL,
    "timestamp" bigint NOT NULL,
    "branchId" uuid NOT NULL,
    sales integer DEFAULT 0 NOT NULL,
    "staffId" uuid,
    "staffName" text DEFAULT ''::text NOT NULL,
    "createdBy" jsonb,
    notes text DEFAULT ''::text NOT NULL,
    "savingsAllocation" integer,
    status text DEFAULT 'draft'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DailyOperation" OWNER TO neondb_owner;

--
-- Name: DailyOperationExpense; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DailyOperationExpense" (
    id uuid NOT NULL,
    "dailyOperationId" uuid NOT NULL,
    name text NOT NULL,
    amount integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."DailyOperationExpense" OWNER TO neondb_owner;

--
-- Name: DayClosing; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."DayClosing" (
    id uuid NOT NULL,
    date text NOT NULL,
    "branchId" uuid NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    metrics jsonb NOT NULL,
    "staffPayouts" jsonb NOT NULL,
    "expectedCash" integer DEFAULT 0 NOT NULL,
    "actualCashCounted" integer DEFAULT 0 NOT NULL,
    "cashDifference" integer DEFAULT 0 NOT NULL,
    "cashStatus" text DEFAULT 'balanced'::text NOT NULL,
    "reconciliationNotes" text,
    summary jsonb NOT NULL,
    "closedBy" text,
    "closedByName" text,
    "closedAt" timestamp(3) without time zone,
    "reopenedBy" text,
    "reopenedByName" text,
    "reopenedAt" timestamp(3) without time zone,
    "closingNotes" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "openedBy" text,
    "openedByName" text,
    "openedAt" timestamp(3) without time zone
);


ALTER TABLE public."DayClosing" OWNER TO neondb_owner;

--
-- Name: ExpenseCategory; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ExpenseCategory" (
    id text NOT NULL,
    name text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ExpenseCategory" OWNER TO neondb_owner;

--
-- Name: ExpenseRecord; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ExpenseRecord" (
    id uuid NOT NULL,
    date text NOT NULL,
    "categoryId" text NOT NULL,
    "categoryName" text NOT NULL,
    description text NOT NULL,
    amount integer NOT NULL,
    "paymentMethod" text NOT NULL,
    "branchId" uuid NOT NULL,
    "staffId" uuid,
    "staffName" text,
    "staffRole" text,
    "staffPaymentType" text,
    "staffPaymentId" uuid,
    "createdBy" jsonb,
    "paidBy" jsonb,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ExpenseRecord" OWNER TO neondb_owner;

--
-- Name: ExpenseTemplate; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ExpenseTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    "defaultAmount" integer,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ExpenseTemplate" OWNER TO neondb_owner;

--
-- Name: Product; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Product" (
    id uuid NOT NULL,
    name text NOT NULL,
    "categoryId" uuid NOT NULL,
    sku text,
    "buyingPrice" integer DEFAULT 0 NOT NULL,
    "sellingPrice" integer DEFAULT 0 NOT NULL,
    "currentStock" integer DEFAULT 0 NOT NULL,
    "minimumStockLevel" integer DEFAULT 0 NOT NULL,
    notes text,
    status text DEFAULT 'in-stock'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Product" OWNER TO neondb_owner;

--
-- Name: ProductCategory; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."ProductCategory" (
    id uuid NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ProductCategory" OWNER TO neondb_owner;

--
-- Name: Purchase; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Purchase" (
    id uuid NOT NULL,
    "invoiceNumber" text NOT NULL,
    date text NOT NULL,
    "supplierId" uuid NOT NULL,
    "supplierName" text NOT NULL,
    "totalCost" integer DEFAULT 0 NOT NULL,
    "branchId" uuid NOT NULL,
    "staffId" uuid,
    "staffName" text,
    "createdBy" jsonb,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Purchase" OWNER TO neondb_owner;

--
-- Name: PurchaseLineItem; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."PurchaseLineItem" (
    id uuid NOT NULL,
    "purchaseId" uuid NOT NULL,
    "productId" uuid NOT NULL,
    "productName" text NOT NULL,
    quantity integer NOT NULL,
    "buyingPrice" integer NOT NULL,
    "lineTotal" integer NOT NULL
);


ALTER TABLE public."PurchaseLineItem" OWNER TO neondb_owner;

--
-- Name: Role; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Role" (
    id uuid NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    modules text[],
    "isSystem" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Role" OWNER TO neondb_owner;

--
-- Name: Sale; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Sale" (
    id uuid NOT NULL,
    "invoiceNumber" text NOT NULL,
    date text NOT NULL,
    "time" text NOT NULL,
    "customerId" uuid,
    "customerName" text,
    subtotal integer DEFAULT 0 NOT NULL,
    discount integer DEFAULT 0 NOT NULL,
    total integer DEFAULT 0 NOT NULL,
    profit integer DEFAULT 0 NOT NULL,
    "paymentMethod" text NOT NULL,
    "branchId" uuid NOT NULL,
    "staffId" uuid,
    "staffName" text,
    "createdBy" jsonb,
    "completedBy" jsonb,
    notes text,
    status text DEFAULT 'completed'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Sale" OWNER TO neondb_owner;

--
-- Name: SaleLineItem; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."SaleLineItem" (
    id uuid NOT NULL,
    "saleId" uuid NOT NULL,
    "productId" uuid NOT NULL,
    "productName" text NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" integer NOT NULL,
    "buyingPrice" integer NOT NULL,
    "lineTotal" integer NOT NULL
);


ALTER TABLE public."SaleLineItem" OWNER TO neondb_owner;

--
-- Name: Session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Session" (
    id uuid NOT NULL,
    token text NOT NULL,
    "userId" uuid NOT NULL,
    locked boolean DEFAULT false NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Session" OWNER TO neondb_owner;

--
-- Name: Staff; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Staff" (
    id uuid NOT NULL,
    name text NOT NULL,
    username text,
    "branchId" uuid NOT NULL,
    "roleId" uuid NOT NULL,
    "loginEnabled" boolean DEFAULT false NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    phone text,
    email text,
    "dailyWage" integer,
    "monthlySalary" integer,
    "dateJoined" text DEFAULT ''::text NOT NULL,
    "emergencyContact" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Staff" OWNER TO neondb_owner;

--
-- Name: StaffPayment; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."StaffPayment" (
    id uuid NOT NULL,
    "staffId" uuid NOT NULL,
    "staffName" text NOT NULL,
    "staffRole" text NOT NULL,
    amount integer NOT NULL,
    "paymentType" text NOT NULL,
    "paymentMethod" text NOT NULL,
    "branchId" uuid NOT NULL,
    date text NOT NULL,
    "expenseId" uuid NOT NULL,
    "paidBy" jsonb,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."StaffPayment" OWNER TO neondb_owner;

--
-- Name: StockMovement; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."StockMovement" (
    id uuid NOT NULL,
    date text NOT NULL,
    "productId" uuid NOT NULL,
    "productName" text NOT NULL,
    movement text NOT NULL,
    quantity integer NOT NULL,
    reason text NOT NULL,
    "branchId" uuid NOT NULL,
    notes text,
    "createdBy" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."StockMovement" OWNER TO neondb_owner;

--
-- Name: StockPriceChange; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."StockPriceChange" (
    id uuid NOT NULL,
    "productId" uuid NOT NULL,
    "previousBuyingPrice" integer NOT NULL,
    "previousSellingPrice" integer NOT NULL,
    "newBuyingPrice" integer NOT NULL,
    "newSellingPrice" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."StockPriceChange" OWNER TO neondb_owner;

--
-- Name: Supplier; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."Supplier" (
    id uuid NOT NULL,
    name text NOT NULL,
    phone text,
    email text,
    address text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Supplier" OWNER TO neondb_owner;

--
-- Name: User; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."User" (
    id uuid NOT NULL,
    username text NOT NULL,
    "displayName" text NOT NULL,
    "passwordHash" text NOT NULL,
    "roleId" uuid NOT NULL,
    "branchId" uuid NOT NULL,
    "staffId" uuid,
    active boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO neondb_owner;

--
-- Name: UserPreference; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public."UserPreference" (
    "userId" uuid NOT NULL,
    "activeBranchCode" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UserPreference" OWNER TO neondb_owner;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO neondb_owner;

--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ActivityLog" (id, type, title, description, "createdAt") FROM stdin;
\.


--
-- Data for Name: AppSetting; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AppSetting" (id, "businessName", "ownerName", "branchNames", "defaultLunchAmount", "updatedAt") FROM stdin;
default	Sonic	Kevin	{"main": "Kansanga"}	3000	2026-08-24 09:14:26.673
\.


--
-- Data for Name: AuditLogEntry; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AuditLogEntry" (id, "timestamp", "userId", "userName", role, "branchCode", action, module, "recordId", detail, "oldValues", "newValues", "createdAt") FROM stdin;
\.


--
-- Data for Name: AuthAuditLog; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."AuthAuditLog" (id, "userId", username, "branchCode", action, detail, "createdAt") FROM stdin;
cf3b776a-ffb3-447b-96a9-8433e0a77d63	2fbd567f-1f85-4d94-a992-3d0bdb0d79b6	owner	main	login	Kevin signed in	2026-08-24 09:14:23.295
\.


--
-- Data for Name: Branch; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Branch" (id, name, code, address, phone, manager, active, "createdAt", "updatedAt") FROM stdin;
ec637cd3-e3ce-4fea-9cbf-4d16aec55f6b	Kansanga	main	\N	\N	\N	t	2026-08-24 09:14:17.771	2026-08-24 09:14:17.771
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Customer" (id, name, phone, email, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DailyOperation; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DailyOperation" (id, date, "time", "timestamp", "branchId", sales, "staffId", "staffName", "createdBy", notes, "savingsAllocation", status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: DailyOperationExpense; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DailyOperationExpense" (id, "dailyOperationId", name, amount) FROM stdin;
\.


--
-- Data for Name: DayClosing; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."DayClosing" (id, date, "branchId", status, metrics, "staffPayouts", "expectedCash", "actualCashCounted", "cashDifference", "cashStatus", "reconciliationNotes", summary, "closedBy", "closedByName", "closedAt", "reopenedBy", "reopenedByName", "reopenedAt", "closingNotes", "createdAt", "updatedAt", "openedBy", "openedByName", "openedAt") FROM stdin;
\.


--
-- Data for Name: ExpenseCategory; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ExpenseCategory" (id, name, "isDefault", "createdAt", "updatedAt") FROM stdin;
rent	Rent	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
lunch	Lunch	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
transport	Transport	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
fuel	Fuel	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
electricity	Electricity	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
water	Water	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
internet	Internet	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
mechanic	Mechanic	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
maintenance	Maintenance	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
cleaning	Cleaning	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
packaging	Packaging	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
printing	Printing	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
taxes	Taxes	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
bank-charges	Bank Charges	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
equipment-repair	Equipment Repair	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
software	Software	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
marketing	Marketing	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
miscellaneous	Miscellaneous	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
staff-payment	Staff	t	2026-08-24 09:14:23.975	2026-08-24 09:14:23.975
\.


--
-- Data for Name: ExpenseRecord; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ExpenseRecord" (id, date, "categoryId", "categoryName", description, amount, "paymentMethod", "branchId", "staffId", "staffName", "staffRole", "staffPaymentType", "staffPaymentId", "createdBy", "paidBy", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ExpenseTemplate; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ExpenseTemplate" (id, name, category, "defaultAmount", active, "createdAt", "updatedAt") FROM stdin;
common-rent	Rent	rent	\N	t	2026-08-24 09:14:24.458	2026-08-24 09:14:24.734
common-lunch	Lunch	lunch	3000	t	2026-08-24 09:14:24.557	2026-08-24 09:14:24.829
common-electricity	Electricity	electricity	\N	t	2026-08-24 09:14:24.66	2026-08-24 09:14:24.925
common-internet	Internet	internet	\N	t	2026-08-24 09:14:24.756	2026-08-24 09:14:25.021
common-transport	Transport	transport	\N	t	2026-08-24 09:14:24.851	2026-08-24 09:14:25.116
common-repairs	Repairs	repairs	\N	t	2026-08-24 09:14:24.947	2026-08-24 09:14:25.211
common-inventory	Inventory	inventory	\N	t	2026-08-24 09:14:25.043	2026-08-24 09:14:25.308
\.


--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Product" (id, name, "categoryId", sku, "buyingPrice", "sellingPrice", "currentStock", "minimumStockLevel", notes, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ProductCategory; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."ProductCategory" (id, slug, name, active, "createdAt", "updatedAt") FROM stdin;
cff50d05-6c99-4d6c-bca5-fd64466b2a9f	flash-disks	Flash Disks	t	2026-08-24 09:14:25.236	2026-08-24 09:14:25.498
23a09ebd-9d90-4061-b720-a69c74586809	hard-drives	Hard Drives	t	2026-08-24 09:14:25.337	2026-08-24 09:14:25.593
158398ba-56d8-4705-900f-3c51ba202d1c	usb-cables	USB Cables	t	2026-08-24 09:14:25.433	2026-08-24 09:14:25.688
71866db5-9eb5-4e08-a46f-36a42683303f	chargers	Chargers	t	2026-08-24 09:14:25.529	2026-08-24 09:14:25.785
1b750753-a2c1-4d06-a067-8878a78966a0	earphones	Earphones	t	2026-08-24 09:14:25.625	2026-08-24 09:14:25.88
ac46c374-57d8-48f5-aeb4-14bcf810847f	bluetooth-speakers	Bluetooth Speakers	t	2026-08-24 09:14:25.72	2026-08-24 09:14:25.975
da625a47-ef09-4810-929e-052bf0d2133d	hdmi-cables	HDMI Cables	t	2026-08-24 09:14:25.815	2026-08-24 09:14:26.071
764812c9-c679-4f09-a87e-dc8dbf210c30	game-controllers	Game Controllers	t	2026-08-24 09:14:25.911	2026-08-24 09:14:26.167
e70febde-8569-4edd-8d68-084435359dbe	phone-accessories	Phone Accessories	t	2026-08-24 09:14:26.007	2026-08-24 09:14:26.291
6b4e9fd5-a8db-4c2f-9a3c-c2780e8703a2	computer-accessories	Computer Accessories	t	2026-08-24 09:14:26.104	2026-08-24 09:14:26.387
bbb0bcee-ff83-498f-a28f-9ce4b6604d9f	networking-equipment	Networking Equipment	t	2026-08-24 09:14:26.199	2026-08-24 09:14:26.482
a186f04c-4cb0-4111-a43d-438dddd36d2d	other-accessories	Other Accessories	t	2026-08-24 09:14:26.295	2026-08-24 09:14:26.577
\.


--
-- Data for Name: Purchase; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Purchase" (id, "invoiceNumber", date, "supplierId", "supplierName", "totalCost", "branchId", "staffId", "staffName", "createdBy", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: PurchaseLineItem; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."PurchaseLineItem" (id, "purchaseId", "productId", "productName", quantity, "buyingPrice", "lineTotal") FROM stdin;
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Role" (id, slug, name, description, modules, "isSystem", "createdAt", "updatedAt") FROM stdin;
28673788-82f3-4517-aa0a-2cb88df214c8	branch-manager	Branch Manager	Manage branch stock, purchasing, reports, and daily operations.	{home,operations,sales,purchasing,expenses,stock,reports}	t	2026-08-24 09:14:18.064	2026-08-24 09:14:26.617
ebe68746-8c98-4537-8694-4befcf65adae	cashier	Cashier	Run daily shop operations, accessory sales, and expenses.	{operations,sales,expenses}	t	2026-08-24 09:14:18.724	2026-08-24 09:14:26.715
d9993984-5e13-40ea-8255-ae24039ac894	owner	Owner	Full system ownership and administration.	{home,operations,sales,purchasing,expenses,stock,branches,reports,history,staff,settings}	t	2026-08-24 09:14:18.822	2026-08-24 09:14:26.813
\.


--
-- Data for Name: Sale; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Sale" (id, "invoiceNumber", date, "time", "customerId", "customerName", subtotal, discount, total, profit, "paymentMethod", "branchId", "staffId", "staffName", "createdBy", "completedBy", notes, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: SaleLineItem; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."SaleLineItem" (id, "saleId", "productId", "productName", quantity, "unitPrice", "buyingPrice", "lineTotal") FROM stdin;
\.


--
-- Data for Name: Session; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Session" (id, token, "userId", locked, "expiresAt", "createdAt") FROM stdin;
1d696932-5821-4327-803a-76168e90e5ef	0bb107f175866f499a9e4e478bdc42b77d184aea8cc5f5a03fea87bfa4c0774e.66a52ab2731c01b31c2e91d3f559e96f15f316ea104112bc4eedd69c4df40f71	2fbd567f-1f85-4d94-a992-3d0bdb0d79b6	f	2026-09-07 09:14:22.63	2026-08-24 09:14:22.821
\.


--
-- Data for Name: Staff; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Staff" (id, name, username, "branchId", "roleId", "loginEnabled", status, active, phone, email, "dailyWage", "monthlySalary", "dateJoined", "emergencyContact", notes, "createdAt", "updatedAt") FROM stdin;
93d3564e-9f4c-450d-b105-e5d0b78c971f	Kevin	owner	ec637cd3-e3ce-4fea-9cbf-4d16aec55f6b	28673788-82f3-4517-aa0a-2cb88df214c8	t	active	t	\N	\N	\N	\N	2026-08-24	\N	\N	2026-08-24 09:14:22.368	2026-08-24 09:14:24.064
\.


--
-- Data for Name: StaffPayment; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."StaffPayment" (id, "staffId", "staffName", "staffRole", amount, "paymentType", "paymentMethod", "branchId", date, "expenseId", "paidBy", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockMovement; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."StockMovement" (id, date, "productId", "productName", movement, quantity, reason, "branchId", notes, "createdBy", "createdAt") FROM stdin;
\.


--
-- Data for Name: StockPriceChange; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."StockPriceChange" (id, "productId", "previousBuyingPrice", "previousSellingPrice", "newBuyingPrice", "newSellingPrice", "createdAt") FROM stdin;
\.


--
-- Data for Name: Supplier; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."Supplier" (id, name, phone, email, address, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."User" (id, username, "displayName", "passwordHash", "roleId", "branchId", "staffId", active, "createdAt", "updatedAt") FROM stdin;
2fbd567f-1f85-4d94-a992-3d0bdb0d79b6	owner	Kevin	$2b$12$axHIyDV/eYns3ZhReP7ek.7mZeRYjHN6mnar9Q8bx/QSDvLAyCZvG	d9993984-5e13-40ea-8255-ae24039ac894	ec637cd3-e3ce-4fea-9cbf-4d16aec55f6b	93d3564e-9f4c-450d-b105-e5d0b78c971f	t	2026-08-24 09:14:21.402	2026-08-24 09:14:23.284
\.


--
-- Data for Name: UserPreference; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public."UserPreference" ("userId", "activeBranchCode", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
047c45ac-c210-4eff-8a80-a836fcf9dbf4	c341b5fc9e2a86f50e75f5e0e91c3fa364851b7573bdae0c4d84b3d24f717151	2026-08-24 09:13:12.235266+00	20260802100000_init	\N	\N	2026-08-24 09:12:51.186137+00	1
183688ed-b416-4809-9031-bb4ed1ba1cac	e4cf0f32d7fef31dd992446f3e8e9e42d5c0a9bfd970ecb5a9c0b1442e11e3db	2026-08-24 09:13:14.760377+00	20260802143000_performance_indexes	\N	\N	2026-08-24 09:13:12.527866+00	1
5cd73f1f-25b4-4011-9135-d4b9e073d999	74077253ba6ef439786ebbf9726dd3fa7ad16c01e40ed5481e30df837b875264	2026-08-24 09:13:18.173705+00	20260802180000_postgres_migration_complete	\N	\N	2026-08-24 09:13:15.055917+00	1
8e66b37d-e898-4ec1-ba2e-d8d85679598d	f3f37da2c022b537f3f85c2753cae53bfb5e1ef80240530d6def4996fdf924a8	2026-08-24 09:13:19.490792+00	20260822180000_day_opening_fields	\N	\N	2026-08-24 09:13:18.465943+00	1
\.


--
-- Name: ActivityLog ActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id);


--
-- Name: AppSetting AppSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AppSetting"
    ADD CONSTRAINT "AppSetting_pkey" PRIMARY KEY (id);


--
-- Name: AuditLogEntry AuditLogEntry_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AuditLogEntry"
    ADD CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY (id);


--
-- Name: AuthAuditLog AuthAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AuthAuditLog"
    ADD CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY (id);


--
-- Name: Branch Branch_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Branch"
    ADD CONSTRAINT "Branch_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: DailyOperationExpense DailyOperationExpense_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DailyOperationExpense"
    ADD CONSTRAINT "DailyOperationExpense_pkey" PRIMARY KEY (id);


--
-- Name: DailyOperation DailyOperation_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DailyOperation"
    ADD CONSTRAINT "DailyOperation_pkey" PRIMARY KEY (id);


--
-- Name: DayClosing DayClosing_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DayClosing"
    ADD CONSTRAINT "DayClosing_pkey" PRIMARY KEY (id);


--
-- Name: ExpenseCategory ExpenseCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ExpenseCategory"
    ADD CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY (id);


--
-- Name: ExpenseRecord ExpenseRecord_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ExpenseRecord"
    ADD CONSTRAINT "ExpenseRecord_pkey" PRIMARY KEY (id);


--
-- Name: ExpenseTemplate ExpenseTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ExpenseTemplate"
    ADD CONSTRAINT "ExpenseTemplate_pkey" PRIMARY KEY (id);


--
-- Name: ProductCategory ProductCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ProductCategory"
    ADD CONSTRAINT "ProductCategory_pkey" PRIMARY KEY (id);


--
-- Name: Product Product_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_pkey" PRIMARY KEY (id);


--
-- Name: PurchaseLineItem PurchaseLineItem_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."PurchaseLineItem"
    ADD CONSTRAINT "PurchaseLineItem_pkey" PRIMARY KEY (id);


--
-- Name: Purchase Purchase_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: SaleLineItem SaleLineItem_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."SaleLineItem"
    ADD CONSTRAINT "SaleLineItem_pkey" PRIMARY KEY (id);


--
-- Name: Sale Sale_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_pkey" PRIMARY KEY (id);


--
-- Name: Session Session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_pkey" PRIMARY KEY (id);


--
-- Name: StaffPayment StaffPayment_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StaffPayment"
    ADD CONSTRAINT "StaffPayment_pkey" PRIMARY KEY (id);


--
-- Name: Staff Staff_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_pkey" PRIMARY KEY (id);


--
-- Name: StockMovement StockMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_pkey" PRIMARY KEY (id);


--
-- Name: StockPriceChange StockPriceChange_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StockPriceChange"
    ADD CONSTRAINT "StockPriceChange_pkey" PRIMARY KEY (id);


--
-- Name: Supplier Supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Supplier"
    ADD CONSTRAINT "Supplier_pkey" PRIMARY KEY (id);


--
-- Name: UserPreference UserPreference_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."UserPreference"
    ADD CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ActivityLog_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ActivityLog_createdAt_idx" ON public."ActivityLog" USING btree ("createdAt");


--
-- Name: ActivityLog_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ActivityLog_type_idx" ON public."ActivityLog" USING btree (type);


--
-- Name: AuditLogEntry_action_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AuditLogEntry_action_idx" ON public."AuditLogEntry" USING btree (action);


--
-- Name: AuditLogEntry_branchCode_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AuditLogEntry_branchCode_idx" ON public."AuditLogEntry" USING btree ("branchCode");


--
-- Name: AuditLogEntry_branchCode_timestamp_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AuditLogEntry_branchCode_timestamp_idx" ON public."AuditLogEntry" USING btree ("branchCode", "timestamp");


--
-- Name: AuditLogEntry_module_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AuditLogEntry_module_idx" ON public."AuditLogEntry" USING btree (module);


--
-- Name: AuditLogEntry_timestamp_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AuditLogEntry_timestamp_idx" ON public."AuditLogEntry" USING btree ("timestamp");


--
-- Name: AuditLogEntry_userId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AuditLogEntry_userId_idx" ON public."AuditLogEntry" USING btree ("userId");


--
-- Name: AuthAuditLog_action_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AuthAuditLog_action_idx" ON public."AuthAuditLog" USING btree (action);


--
-- Name: AuthAuditLog_branchCode_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AuthAuditLog_branchCode_createdAt_idx" ON public."AuthAuditLog" USING btree ("branchCode", "createdAt");


--
-- Name: AuthAuditLog_branchCode_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AuthAuditLog_branchCode_idx" ON public."AuthAuditLog" USING btree ("branchCode");


--
-- Name: AuthAuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AuthAuditLog_createdAt_idx" ON public."AuthAuditLog" USING btree ("createdAt");


--
-- Name: AuthAuditLog_userId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "AuthAuditLog_userId_idx" ON public."AuthAuditLog" USING btree ("userId");


--
-- Name: Branch_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Branch_active_idx" ON public."Branch" USING btree (active);


--
-- Name: Branch_code_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Branch_code_key" ON public."Branch" USING btree (code);


--
-- Name: Branch_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Branch_name_idx" ON public."Branch" USING btree (name);


--
-- Name: Customer_email_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Customer_email_idx" ON public."Customer" USING btree (email);


--
-- Name: Customer_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Customer_name_idx" ON public."Customer" USING btree (name);


--
-- Name: Customer_phone_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Customer_phone_idx" ON public."Customer" USING btree (phone);


--
-- Name: DailyOperationExpense_dailyOperationId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DailyOperationExpense_dailyOperationId_idx" ON public."DailyOperationExpense" USING btree ("dailyOperationId");


--
-- Name: DailyOperation_branchId_date_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "DailyOperation_branchId_date_key" ON public."DailyOperation" USING btree ("branchId", date);


--
-- Name: DailyOperation_branchId_date_timestamp_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DailyOperation_branchId_date_timestamp_idx" ON public."DailyOperation" USING btree ("branchId", date, "timestamp");


--
-- Name: DailyOperation_branchId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DailyOperation_branchId_idx" ON public."DailyOperation" USING btree ("branchId");


--
-- Name: DailyOperation_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DailyOperation_date_idx" ON public."DailyOperation" USING btree (date);


--
-- Name: DailyOperation_staffId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DailyOperation_staffId_idx" ON public."DailyOperation" USING btree ("staffId");


--
-- Name: DailyOperation_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DailyOperation_status_idx" ON public."DailyOperation" USING btree (status);


--
-- Name: DailyOperation_timestamp_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DailyOperation_timestamp_idx" ON public."DailyOperation" USING btree ("timestamp");


--
-- Name: DayClosing_branchId_date_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "DayClosing_branchId_date_key" ON public."DayClosing" USING btree ("branchId", date);


--
-- Name: DayClosing_branchId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DayClosing_branchId_idx" ON public."DayClosing" USING btree ("branchId");


--
-- Name: DayClosing_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DayClosing_date_idx" ON public."DayClosing" USING btree (date);


--
-- Name: DayClosing_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "DayClosing_status_idx" ON public."DayClosing" USING btree (status);


--
-- Name: ExpenseCategory_isDefault_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ExpenseCategory_isDefault_idx" ON public."ExpenseCategory" USING btree ("isDefault");


--
-- Name: ExpenseCategory_name_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "ExpenseCategory_name_key" ON public."ExpenseCategory" USING btree (name);


--
-- Name: ExpenseRecord_branchId_date_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ExpenseRecord_branchId_date_createdAt_idx" ON public."ExpenseRecord" USING btree ("branchId", date, "createdAt");


--
-- Name: ExpenseRecord_branchId_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ExpenseRecord_branchId_date_idx" ON public."ExpenseRecord" USING btree ("branchId", date);


--
-- Name: ExpenseRecord_branchId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ExpenseRecord_branchId_idx" ON public."ExpenseRecord" USING btree ("branchId");


--
-- Name: ExpenseRecord_categoryId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ExpenseRecord_categoryId_idx" ON public."ExpenseRecord" USING btree ("categoryId");


--
-- Name: ExpenseRecord_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ExpenseRecord_createdAt_idx" ON public."ExpenseRecord" USING btree ("createdAt");


--
-- Name: ExpenseRecord_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ExpenseRecord_date_idx" ON public."ExpenseRecord" USING btree (date);


--
-- Name: ExpenseRecord_staffId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ExpenseRecord_staffId_idx" ON public."ExpenseRecord" USING btree ("staffId");


--
-- Name: ExpenseRecord_staffPaymentId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "ExpenseRecord_staffPaymentId_key" ON public."ExpenseRecord" USING btree ("staffPaymentId");


--
-- Name: ExpenseTemplate_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ExpenseTemplate_active_idx" ON public."ExpenseTemplate" USING btree (active);


--
-- Name: ProductCategory_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ProductCategory_active_idx" ON public."ProductCategory" USING btree (active);


--
-- Name: ProductCategory_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "ProductCategory_name_idx" ON public."ProductCategory" USING btree (name);


--
-- Name: ProductCategory_slug_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "ProductCategory_slug_key" ON public."ProductCategory" USING btree (slug);


--
-- Name: Product_categoryId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Product_categoryId_idx" ON public."Product" USING btree ("categoryId");


--
-- Name: Product_categoryId_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Product_categoryId_status_idx" ON public."Product" USING btree ("categoryId", status);


--
-- Name: Product_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Product_name_idx" ON public."Product" USING btree (name);


--
-- Name: Product_sku_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Product_sku_key" ON public."Product" USING btree (sku);


--
-- Name: Product_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Product_status_idx" ON public."Product" USING btree (status);


--
-- Name: PurchaseLineItem_productId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "PurchaseLineItem_productId_idx" ON public."PurchaseLineItem" USING btree ("productId");


--
-- Name: PurchaseLineItem_purchaseId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "PurchaseLineItem_purchaseId_idx" ON public."PurchaseLineItem" USING btree ("purchaseId");


--
-- Name: Purchase_branchId_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Purchase_branchId_date_idx" ON public."Purchase" USING btree ("branchId", date);


--
-- Name: Purchase_branchId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Purchase_branchId_idx" ON public."Purchase" USING btree ("branchId");


--
-- Name: Purchase_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Purchase_createdAt_idx" ON public."Purchase" USING btree ("createdAt");


--
-- Name: Purchase_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Purchase_date_idx" ON public."Purchase" USING btree (date);


--
-- Name: Purchase_invoiceNumber_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Purchase_invoiceNumber_key" ON public."Purchase" USING btree ("invoiceNumber");


--
-- Name: Purchase_staffId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Purchase_staffId_idx" ON public."Purchase" USING btree ("staffId");


--
-- Name: Purchase_supplierId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Purchase_supplierId_idx" ON public."Purchase" USING btree ("supplierId");


--
-- Name: Role_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Role_name_idx" ON public."Role" USING btree (name);


--
-- Name: Role_slug_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Role_slug_key" ON public."Role" USING btree (slug);


--
-- Name: SaleLineItem_productId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "SaleLineItem_productId_idx" ON public."SaleLineItem" USING btree ("productId");


--
-- Name: SaleLineItem_saleId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "SaleLineItem_saleId_idx" ON public."SaleLineItem" USING btree ("saleId");


--
-- Name: Sale_branchId_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Sale_branchId_date_idx" ON public."Sale" USING btree ("branchId", date);


--
-- Name: Sale_branchId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Sale_branchId_idx" ON public."Sale" USING btree ("branchId");


--
-- Name: Sale_branchId_status_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Sale_branchId_status_date_idx" ON public."Sale" USING btree ("branchId", status, date);


--
-- Name: Sale_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Sale_createdAt_idx" ON public."Sale" USING btree ("createdAt");


--
-- Name: Sale_customerId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Sale_customerId_idx" ON public."Sale" USING btree ("customerId");


--
-- Name: Sale_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Sale_date_idx" ON public."Sale" USING btree (date);


--
-- Name: Sale_invoiceNumber_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Sale_invoiceNumber_key" ON public."Sale" USING btree ("invoiceNumber");


--
-- Name: Sale_staffId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Sale_staffId_idx" ON public."Sale" USING btree ("staffId");


--
-- Name: Sale_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Sale_status_idx" ON public."Sale" USING btree (status);


--
-- Name: Session_expiresAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Session_expiresAt_idx" ON public."Session" USING btree ("expiresAt");


--
-- Name: Session_token_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Session_token_key" ON public."Session" USING btree (token);


--
-- Name: Session_userId_expiresAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Session_userId_expiresAt_idx" ON public."Session" USING btree ("userId", "expiresAt");


--
-- Name: Session_userId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Session_userId_idx" ON public."Session" USING btree ("userId");


--
-- Name: StaffPayment_branchId_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StaffPayment_branchId_date_idx" ON public."StaffPayment" USING btree ("branchId", date);


--
-- Name: StaffPayment_branchId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StaffPayment_branchId_idx" ON public."StaffPayment" USING btree ("branchId");


--
-- Name: StaffPayment_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StaffPayment_createdAt_idx" ON public."StaffPayment" USING btree ("createdAt");


--
-- Name: StaffPayment_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StaffPayment_date_idx" ON public."StaffPayment" USING btree (date);


--
-- Name: StaffPayment_expenseId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "StaffPayment_expenseId_key" ON public."StaffPayment" USING btree ("expenseId");


--
-- Name: StaffPayment_staffId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StaffPayment_staffId_idx" ON public."StaffPayment" USING btree ("staffId");


--
-- Name: Staff_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Staff_active_idx" ON public."Staff" USING btree (active);


--
-- Name: Staff_branchId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Staff_branchId_idx" ON public."Staff" USING btree ("branchId");


--
-- Name: Staff_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Staff_name_idx" ON public."Staff" USING btree (name);


--
-- Name: Staff_roleId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Staff_roleId_idx" ON public."Staff" USING btree ("roleId");


--
-- Name: Staff_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Staff_status_idx" ON public."Staff" USING btree (status);


--
-- Name: Staff_username_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "Staff_username_key" ON public."Staff" USING btree (username);


--
-- Name: StockMovement_branchId_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockMovement_branchId_date_idx" ON public."StockMovement" USING btree ("branchId", date);


--
-- Name: StockMovement_branchId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockMovement_branchId_idx" ON public."StockMovement" USING btree ("branchId");


--
-- Name: StockMovement_date_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockMovement_date_createdAt_idx" ON public."StockMovement" USING btree (date, "createdAt");


--
-- Name: StockMovement_date_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockMovement_date_idx" ON public."StockMovement" USING btree (date);


--
-- Name: StockMovement_movement_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockMovement_movement_idx" ON public."StockMovement" USING btree (movement);


--
-- Name: StockMovement_productId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockMovement_productId_idx" ON public."StockMovement" USING btree ("productId");


--
-- Name: StockPriceChange_createdAt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockPriceChange_createdAt_idx" ON public."StockPriceChange" USING btree ("createdAt");


--
-- Name: StockPriceChange_productId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "StockPriceChange_productId_idx" ON public."StockPriceChange" USING btree ("productId");


--
-- Name: Supplier_email_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Supplier_email_idx" ON public."Supplier" USING btree (email);


--
-- Name: Supplier_name_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Supplier_name_idx" ON public."Supplier" USING btree (name);


--
-- Name: Supplier_phone_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "Supplier_phone_idx" ON public."Supplier" USING btree (phone);


--
-- Name: User_active_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "User_active_idx" ON public."User" USING btree (active);


--
-- Name: User_branchId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "User_branchId_idx" ON public."User" USING btree ("branchId");


--
-- Name: User_roleId_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "User_roleId_idx" ON public."User" USING btree ("roleId");


--
-- Name: User_staffId_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "User_staffId_key" ON public."User" USING btree ("staffId");


--
-- Name: User_username_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX "User_username_key" ON public."User" USING btree (username);


--
-- Name: AuthAuditLog AuthAuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."AuthAuditLog"
    ADD CONSTRAINT "AuthAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyOperationExpense DailyOperationExpense_dailyOperationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DailyOperationExpense"
    ADD CONSTRAINT "DailyOperationExpense_dailyOperationId_fkey" FOREIGN KEY ("dailyOperationId") REFERENCES public."DailyOperation"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DailyOperation DailyOperation_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DailyOperation"
    ADD CONSTRAINT "DailyOperation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DailyOperation DailyOperation_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DailyOperation"
    ADD CONSTRAINT "DailyOperation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DayClosing DayClosing_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."DayClosing"
    ADD CONSTRAINT "DayClosing_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ExpenseRecord ExpenseRecord_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ExpenseRecord"
    ADD CONSTRAINT "ExpenseRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ExpenseRecord ExpenseRecord_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ExpenseRecord"
    ADD CONSTRAINT "ExpenseRecord_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ExpenseCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ExpenseRecord ExpenseRecord_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."ExpenseRecord"
    ADD CONSTRAINT "ExpenseRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Product Product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Product"
    ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ProductCategory"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseLineItem PurchaseLineItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."PurchaseLineItem"
    ADD CONSTRAINT "PurchaseLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: PurchaseLineItem PurchaseLineItem_purchaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."PurchaseLineItem"
    ADD CONSTRAINT "PurchaseLineItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES public."Purchase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Purchase Purchase_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Purchase Purchase_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Purchase Purchase_supplierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Purchase"
    ADD CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES public."Supplier"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleLineItem SaleLineItem_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."SaleLineItem"
    ADD CONSTRAINT "SaleLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SaleLineItem SaleLineItem_saleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."SaleLineItem"
    ADD CONSTRAINT "SaleLineItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES public."Sale"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Sale Sale_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Sale Sale_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Sale Sale_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Sale"
    ADD CONSTRAINT "Sale_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Session Session_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Session"
    ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffPayment StaffPayment_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StaffPayment"
    ADD CONSTRAINT "StaffPayment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StaffPayment StaffPayment_expenseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StaffPayment"
    ADD CONSTRAINT "StaffPayment_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES public."ExpenseRecord"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffPayment StaffPayment_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StaffPayment"
    ADD CONSTRAINT "StaffPayment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Staff Staff_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Staff Staff_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."Staff"
    ADD CONSTRAINT "Staff_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockMovement StockMovement_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockMovement StockMovement_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockPriceChange StockPriceChange_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."StockPriceChange"
    ADD CONSTRAINT "StockPriceChange_productId_fkey" FOREIGN KEY ("productId") REFERENCES public."Product"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserPreference UserPreference_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."UserPreference"
    ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_branchId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branch"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_staffId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES public."Staff"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict 1sZVPvZlJ3Qrs7BUVVP31Xgdrp24fbJGQsbVz3P5guYgyTP9NMoj9vsujM1IaWh

