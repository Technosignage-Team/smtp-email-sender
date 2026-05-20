-- ============================================================================
--  EmailSender — migration 02: User accounts, per-service sender, templates
--  Run AFTER 01_schema.sql
--  Target database: EmailSender
-- ============================================================================

USE [EmailSender];
GO

-- ----------------------------------------------------------------------------
--  dbo.Users
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        Id           INT            IDENTITY(1,1) NOT NULL,
        Username     NVARCHAR(100)  NOT NULL,
        Email        NVARCHAR(256)  NULL,
        PasswordHash NVARCHAR(512)  NOT NULL,
        IsActive     BIT            NOT NULL CONSTRAINT DF_Users_IsActive   DEFAULT (1),
        CreatedAt    DATETIME2(0)   NOT NULL CONSTRAINT DF_Users_CreatedAt  DEFAULT (SYSUTCDATETIME()),
        UpdatedAt    DATETIME2(0)   NOT NULL CONSTRAINT DF_Users_UpdatedAt  DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Users          PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT UQ_Users_Username UNIQUE NONCLUSTERED (Username)
    );
END
GO

-- ----------------------------------------------------------------------------
--  dbo.Apps — add per-service sender + owner FK
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Apps') AND name = 'UserId')
    ALTER TABLE dbo.Apps ADD UserId INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Apps') AND name = 'SenderEmail')
    ALTER TABLE dbo.Apps ADD SenderEmail NVARCHAR(256) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Apps') AND name = 'SenderName')
    ALTER TABLE dbo.Apps ADD SenderName NVARCHAR(150) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Apps') AND name = 'SmtpUsername')
    ALTER TABLE dbo.Apps ADD SmtpUsername NVARCHAR(256) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Apps') AND name = 'SmtpPassword')
    ALTER TABLE dbo.Apps ADD SmtpPassword NVARCHAR(512) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Apps') AND name = 'SmtpServer')
    ALTER TABLE dbo.Apps ADD SmtpServer NVARCHAR(256) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Apps') AND name = 'SmtpPort')
    ALTER TABLE dbo.Apps ADD SmtpPort INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Apps') AND name = 'SmtpEncryption')
    ALTER TABLE dbo.Apps ADD SmtpEncryption NVARCHAR(20) NULL;
GO

-- Add FK after Users table exists
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_Apps_Users_UserId'
      AND parent_object_id = OBJECT_ID('dbo.Apps')
)
    ALTER TABLE dbo.Apps
        ADD CONSTRAINT FK_Apps_Users_UserId
        FOREIGN KEY (UserId) REFERENCES dbo.Users(Id)
        ON DELETE SET NULL;
GO

-- ----------------------------------------------------------------------------
--  dbo.EmailTemplates
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.EmailTemplates', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.EmailTemplates
    (
        Id        INT            IDENTITY(1,1) NOT NULL,
        AppId     INT            NOT NULL,
        Name      NVARCHAR(150)  NOT NULL,
        Subject   NVARCHAR(500)  NOT NULL,
        Body      NVARCHAR(MAX)  NOT NULL,
        IsHtml    BIT            NOT NULL CONSTRAINT DF_EmailTemplates_IsHtml     DEFAULT (1),
        CreatedAt DATETIME2(0)   NOT NULL CONSTRAINT DF_EmailTemplates_CreatedAt  DEFAULT (SYSUTCDATETIME()),
        UpdatedAt DATETIME2(0)   NOT NULL CONSTRAINT DF_EmailTemplates_UpdatedAt  DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_EmailTemplates           PRIMARY KEY CLUSTERED (Id),
        CONSTRAINT FK_EmailTemplates_Apps_AppId FOREIGN KEY (AppId)
            REFERENCES dbo.Apps(Id) ON DELETE CASCADE
    );

    CREATE INDEX IX_EmailTemplates_AppId ON dbo.EmailTemplates (AppId);
END
GO

-- ----------------------------------------------------------------------------
--  Fix Apps unique constraint: replace global UQ_Apps_AppName with a
--  per-user unique index so different users can have services with the same name
-- ----------------------------------------------------------------------------
IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UQ_Apps_AppName'
      AND object_id = OBJECT_ID('dbo.Apps')
)
BEGIN
    ALTER TABLE dbo.Apps DROP CONSTRAINT UQ_Apps_AppName;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'UIX_Apps_UserId_AppName'
      AND object_id = OBJECT_ID('dbo.Apps')
)
BEGIN
    CREATE UNIQUE INDEX UIX_Apps_UserId_AppName
        ON dbo.Apps (UserId, AppName)
        WHERE UserId IS NOT NULL;
END
GO
