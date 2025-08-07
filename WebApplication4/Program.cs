using WebApplication4;
using WebApplication4.Services;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using Microsoft.OpenApi.Models;
using NetTopologySuite.Geometries;

var builder = WebApplication.CreateBuilder(args);

var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

// Veritabanı bağlantısı
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"),
        x => x.UseNetTopologySuite()));

// Servis ekleme
builder.Services.AddScoped<MyInterface, PointService>();

// JSON ayarları
builder.Services.AddControllers()
    .AddNewtonsoftJson(); // NewtonsoftJson desteği

// CORS servisini ekle
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      policy =>
                      {
                          policy.WithOrigins("http://localhost:3000") // React'in portu
                                .AllowAnyHeader()
                                .AllowAnyMethod();
                      });
});

builder.Services.AddEndpointsApiExplorer();

// SWAGGER yapılandırması
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "My API",
        Version = "v1",
        Description = "My API description",
        Contact = new OpenApiContact
        {
            Name = "Your Name",
            Email = "your.email@example.com"
        }
    });

    // Geometry tipi için Swagger desteği (WKT formatı)
    c.MapType<Geometry>(() => new OpenApiSchema
    {
        Type = "string",
        Format = "wkt",
        Description = "WKT (Well Known Text) formatında geometri"
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();

    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        // Swagger endpoint tanımı — HTTPS uyumlu
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
        c.RoutePrefix = string.Empty; // localhost:5000 açıldığında direkt swagger gelsin
    });
}

app.UseHttpsRedirection();

// CORS middleware buraya eklenmeli, UseAuthorization'dan önce
app.UseCors(MyAllowSpecificOrigins);

app.UseAuthorization();

app.MapControllers();

app.Run(); 