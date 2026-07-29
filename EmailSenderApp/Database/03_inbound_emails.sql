-- ============================================================================
--  EmailSender — inbound email listening + webhook notifications
--  Run AFTER 01_schema.sql and 02_account_templates.sql
-- ============================================================================

USE [EmailSender];
GO

-- ── IMAP settings on Apps (per-service mailbox listening) ─────────────────────
IF COL_LENGTH('dbo.Apps', 'ImapEnabled') IS NULL
BEGIN
    ALTER TABLE dbo.Apps ADD
        ImapEnabled     BIT             NOT NULL CONSTRAINT DF_Apps_ImapEnabled     DEFAULT (0),
        ImapServer      NVARCHAR(256)   NULL,
        ImapPort        INT             NULL,
        ImapUsername    NVARCHAR(256)   NULL,
        ImapPassword    NVARCHAR(512)   NULL,
        ImapUseSsl      BIT             NOT NULL CONSTRAINT DF_Apps_ImapUseSsl      DEFAULT (1),
        LastImapUid     BIGINT          NULL,
        LastImapPollAt  DATETIME2(0)    NULL;
END
GO

-- ── IncomingEmails — stored received messages ─────────────────────────────────
IF OBJECT_ID(N'dbo.IncomingEmails', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.IncomingEmails
    (
        Id               BIGINT          IDENTITY(1,1) NOT NULL,
        AppId            INT             NOT NULL,
        AppName          NVARCHAR(150)   NOT NULL,
        MessageId        NVARCHAR(500)   NULL,
        FromAddress      NVARCHAR(256)   NOT NULL,
        FromName         NVARCHAR(256)   NULL,
        ToAddress        NVARCHAR(256)   NOT NULL,
        Subject          NVARCHAR(500)   NOT NULL,
        BodyPreview      NVARCHAR(2000)  NULL,
        BodyText         NVARCHAR(MAX)   NULL,
        BodyHtml         NVARCHAR(MAX)   NULL,
        HasAttachments   BIT             NOT NULL CONSTRAINT DF_IncomingEmails_HasAttachments DEFAULT (0),
        AttachmentCount  INT             NOT NULL CONSTRAINT DF_IncomingEmails_AttachmentCount DEFAULT (0),
        ImapUid          BIGINT          NULL,
        IsRead           BIT             NOT NULL CONSTRAINT DF_IncomingEmails_IsRead DEFAULT (0),
        ReceivedAt       DATETIME2(0)    NOT NULL CONSTRAINT DF_IncomingEmails_ReceivedAt DEFAULT (SYSUTCDATETIME()),
        CreatedAt        DATETIME2(0)    NOT NULL CONSTRAINT DF_IncomingEmails_CreatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_IncomingEmails PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_IncomingEmails_Apps_AppId FOREIGN KEY (AppId) REFERENCES dbo.Apps(Id)
    );

    CREATE INDEX IX_IncomingEmails_AppId_ReceivedAt ON dbo.IncomingEmails (AppId, ReceivedAt DESC);
    CREATE INDEX IX_IncomingEmails_ReceivedAt       ON dbo.IncomingEmails (ReceivedAt DESC);
    CREATE INDEX IX_IncomingEmails_IsRead           ON dbo.IncomingEmails (IsRead);

    -- Prevent duplicate imports from the same mailbox
    CREATE UNIQUE INDEX UQ_IncomingEmails_AppId_MessageId
        ON dbo.IncomingEmails (AppId, MessageId)
        WHERE MessageId IS NOT NULL;
END
GO

-- ── WebhookSubscriptions — external app callback URLs ───────────────────────
IF OBJECT_ID(N'dbo.WebhookSubscriptions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WebhookSubscriptions
    (
        Id          INT             IDENTITY(1,1) NOT NULL,
        AppId       INT             NOT NULL,
        Url         NVARCHAR(1000)  NOT NULL,
        Secret      NVARCHAR(128)   NOT NULL,
        Events      NVARCHAR(200)   NOT NULL CONSTRAINT DF_WebhookSubscriptions_Events DEFAULT (N'email.received'),
        IsActive    BIT             NOT NULL CONSTRAINT DF_WebhookSubscriptions_IsActive DEFAULT (1),
        CreatedAt   DATETIME2(0)    NOT NULL CONSTRAINT DF_WebhookSubscriptions_CreatedAt DEFAULT (SYSUTCDATETIME()),
        UpdatedAt   DATETIME2(0)    NOT NULL CONSTRAINT DF_WebhookSubscriptions_UpdatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_WebhookSubscriptions PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_WebhookSubscriptions_Apps_AppId FOREIGN KEY (AppId) REFERENCES dbo.Apps(Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_WebhookSubscriptions_AppId ON dbo.WebhookSubscriptions (AppId);
END
GO

-- ── WebhookDeliveryLogs — audit trail for webhook POST attempts ───────────────
IF OBJECT_ID(N'dbo.WebhookDeliveryLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WebhookDeliveryLogs
    (
        Id                      BIGINT          IDENTITY(1,1) NOT NULL,
        WebhookSubscriptionId   INT             NOT NULL,
        IncomingEmailId         BIGINT          NOT NULL,
        Status                  VARCHAR(20)     NOT NULL,   -- Sent | Failed
        HttpStatusCode          INT             NULL,
        ErrorMessage            NVARCHAR(2000)  NULL,
        AttemptedAt             DATETIME2(0)    NOT NULL CONSTRAINT DF_WebhookDeliveryLogs_AttemptedAt DEFAULT (SYSUTCDATETIME()),
        DurationMs              INT             NULL,
        CONSTRAINT PK_WebhookDeliveryLogs PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_WebhookDeliveryLogs_WebhookSubscriptions
            FOREIGN KEY (WebhookSubscriptionId) REFERENCES dbo.WebhookSubscriptions(Id),
        CONSTRAINT FK_WebhookDeliveryLogs_IncomingEmails
            FOREIGN KEY (IncomingEmailId) REFERENCES dbo.IncomingEmails(Id)
    );

    CREATE INDEX IX_WebhookDeliveryLogs_SubscriptionId ON dbo.WebhookDeliveryLogs (WebhookSubscriptionId, AttemptedAt DESC);
    CREATE INDEX IX_WebhookDeliveryLogs_IncomingEmailId ON dbo.WebhookDeliveryLogs (IncomingEmailId);
END
GO

-- Quick sanity check
SELECT TOP (3) COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Apps' AND COLUMN_NAME LIKE 'Imap%';
SELECT TOP (3) Id, AppName, FromAddress, Subject, ReceivedAt FROM dbo.IncomingEmails ORDER BY Id DESC;
SELECT TOP (3) Id, AppId, Url, IsActive FROM dbo.WebhookSubscriptions ORDER BY Id DESC;
GO
