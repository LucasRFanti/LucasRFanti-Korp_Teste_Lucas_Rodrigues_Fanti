using BCrypt.Net;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PortalAdmin.Data;
using PortalAdmin.Models.Entities;
using System.Text;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.ReferenceHandler = 
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        options.JsonSerializerOptions.WriteIndented = true;
    });


builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.Migrate();

    db.Database.ExecuteSqlRaw(@"
IF OBJECT_ID(N'[IdempotencyRequests]', N'U') IS NULL
BEGIN
    CREATE TABLE [IdempotencyRequests] (
        [Id] uniqueidentifier NOT NULL PRIMARY KEY,
        [Scope] nvarchar(120) NOT NULL,
        [RequestKey] nvarchar(120) NOT NULL,
        [NotaFiscalId] uniqueidentifier NOT NULL,
        [CriadoEm] datetime2 NOT NULL
    );

    CREATE UNIQUE INDEX [IX_IdempotencyRequests_Scope_RequestKey]
    ON [IdempotencyRequests] ([Scope], [RequestKey]);
END");

    if (!db.Users.Any())
    {
        db.Users.Add(new User
        {
            Email = "admin@portal.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456")
        });
        db.SaveChanges();
    }
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();