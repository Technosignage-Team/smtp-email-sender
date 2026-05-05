-- ============================================================================
--  EmailSender — schema for app registration + per-app email send logging
--  Target server: 192.175.127.213
--  Target database: EmailSender
--
--  Run order:
--    1. (optional) CREATE DATABASE if it does not yet exist.
--    2. USE [EmailSender];
--    3. Run the rest of this script.
-- ============================================================================

IF DB_ID(N'EmailSender') IS NULL
BEGIN
    CREATE DATABASE [EmailSender];
END
GO

USE [EmailSender];
GO

-- ----------------------------------------------------------------------------
--  dbo.Apps
--  One row per third-party application that is allowed to call our API.
--  AppKey is the secret token the caller must send in the X-Api-Key header.
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Apps', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Apps
    (
        Id              INT             IDENTITY(1,1) NOT NULL,
        AppName         NVARCHAR(150)   NOT NULL,
        AppUrl          NVARCHAR(500)   NULL,            -- caller's public URL / origin (informational)
        AppKey          NVARCHAR(128)   NOT NULL,        -- API key the caller sends in X-Api-Key
        Description     NVARCHAR(1000)  NULL,
        ContactEmail    NVARCHAR(256)   NULL,
        IsActive        BIT             NOT NULL CONSTRAINT DF_Apps_IsActive       DEFAULT (1),
        DailyQuota      INT             NULL,            -- optional per-day send limit (NULL = unlimited)
        CreatedAt       DATETIME2(0)    NOT NULL CONSTRAINT DF_Apps_CreatedAt      DEFAULT (SYSUTCDATETIME()),
        UpdatedAt       DATETIME2(0)    NOT NULL CONSTRAINT DF_Apps_UpdatedAt      DEFAULT (SYSUTCDATETIME()),
        LastUsedAt      DATETIME2(0)    NULL,
        CONSTRAINT PK_Apps        PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Apps_AppKey UNIQUE NONCLUSTERED (AppKey),
        CONSTRAINT UQ_Apps_AppName UNIQUE NONCLUSTERED (AppName)
    );
END
GO

-- ----------------------------------------------------------------------------
--  dbo.EmailLogs
--  One row per email send attempt. Stores which app sent it, recipients,
--  status, error (if any), attachments count, etc.
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.EmailLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmailLogs
    (
        Id                BIGINT         IDENTITY(1,1) NOT NULL,
        AppId             INT            NOT NULL,
        AppName           NVARCHAR(150)  NOT NULL,         -- denormalized for fast reporting
        Subject           NVARCHAR(500)  NOT NULL,
        Recipients        NVARCHAR(MAX)  NOT NULL,         -- comma-separated final recipient list
        RecipientCount    INT            NOT NULL CONSTRAINT DF_EmailLogs_RecipientCount DEFAULT (0),
        AttachmentCount   INT            NOT NULL CONSTRAINT DF_EmailLogs_AttachmentCount DEFAULT (0),
        AttachmentBytes   BIGINT         NOT NULL CONSTRAINT DF_EmailLogs_AttachmentBytes DEFAULT (0),
        IsHtml            BIT            NOT NULL CONSTRAINT DF_EmailLogs_IsHtml DEFAULT (1),
        BodyPreview       NVARCHAR(2000) NULL,             -- first ~2000 chars of body (for audit)
        Status            VARCHAR(20)    NOT NULL,         -- 'Sent' | 'Failed' | 'Rejected'
        ErrorMessage      NVARCHAR(2000) NULL,
        IpAddress         VARCHAR(45)    NULL,             -- IPv4/IPv6 of caller
        UserAgent         NVARCHAR(500)  NULL,
        SentAt            DATETIME2(0)   NOT NULL CONSTRAINT DF_EmailLogs_SentAt   DEFAULT (SYSUTCDATETIME()),
        DurationMs        INT            NULL,
        CONSTRAINT PK_EmailLogs            PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_EmailLogs_Apps_AppId FOREIGN KEY (AppId) REFERENCES dbo.Apps(Id)
    );

    CREATE INDEX IX_EmailLogs_AppId_SentAt ON dbo.EmailLogs (AppId, SentAt DESC);
    CREATE INDEX IX_EmailLogs_SentAt       ON dbo.EmailLogs (SentAt DESC);
    CREATE INDEX IX_EmailLogs_Status       ON dbo.EmailLogs (Status);
END
GO

-- ----------------------------------------------------------------------------
--  (Optional) seed an initial "Admin / Test" app so you can call the API
--  immediately. Replace the AppKey with a freshly generated GUID in production.
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.Apps WHERE AppName = N'Test App')
BEGIN
    INSERT INTO dbo.Apps (AppName, AppUrl, AppKey, Description, ContactEmail)
    VALUES (
        N'Test App',
        N'http://localhost',
        N'test-' + REPLACE(CONVERT(NVARCHAR(36), NEWID()), '-', ''),
        N'Default test app — replace key before production use.',
        N'admin@example.com'
    );
END
GO

-- Quick sanity check
SELECT TOP (5) Id, AppName, AppKey, IsActive, CreatedAt FROM dbo.Apps ORDER BY Id DESC;
SELECT TOP (5) Id, AppName, Status, RecipientCount, SentAt FROM dbo.EmailLogs ORDER BY Id DESC;
