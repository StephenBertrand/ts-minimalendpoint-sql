CREATE TABLE dbo.Todos (
  Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Todos PRIMARY KEY,
  Title nvarchar(200) NOT NULL,
  IsComplete bit NOT NULL,
  CreatedUtc datetimeoffset NOT NULL
);
