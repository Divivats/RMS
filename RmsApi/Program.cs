using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using RmsApi.Data;
using RmsApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT Authentication
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
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ATS Services
builder.Services.AddHttpClient<ThorDocumentService>();
builder.Services.AddScoped<ResumeParserService>();
builder.Services.AddSingleton<AtsScoringService>();
builder.Services.AddHttpClient<SemcatAiService>();
builder.Services.AddScoped<AtsOrchestrator>();

// CORS — Allow any origin on the local network
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// ── Auto-seed Admin account on startup ──
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        // Ensure database exists (tables must already be created via SQL script)
        if (!db.Users.Any(u => u.Role == "Admin"))
        {
            db.Users.Add(new RmsApi.Models.User
            {
                FullName = "Shiv Bora",
                Email = "shiv@samsung.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Shiv@rms123"),
                Role = "Admin",
                IsActive = true
            });
            db.SaveChanges();
            Console.WriteLine("[RMS] Admin account created: shiv@samsung.com / Shiv@rms123");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[RMS] Seed skipped (DB may not be ready): {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
