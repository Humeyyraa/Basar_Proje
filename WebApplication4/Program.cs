using WebApplication4;
using WebApplication4.Services;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using Microsoft.OpenApi.Models;
using NetTopologySuite.Geometries;

var builder = WebApplication.CreateBuilder(args);

var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"),
        x => x.UseNetTopologySuite()));

builder.Services.AddScoped<MyInterface, PointService>();

 
builder.Services.AddControllers()
    .AddNewtonsoftJson(); 


builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      policy =>
                      {
                          policy.WithOrigins("http://localhost:3000")
                                .AllowAnyHeader()
                                .AllowAnyMethod();
                      });
});

builder.Services.AddEndpointsApiExplorer();

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
       
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "My API V1");
        c.RoutePrefix = string.Empty; 
    });
}

// Only enforce HTTPS redirection outside development to avoid local TLS issues
if (!app.Environment.IsDevelopment())
{
app.UseRouting();

// Only enforce HTTPS redirection outside development to avoid local TLS issues
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
}


app.UseCors(MyAllowSpecificOrigins);

app.UseAuthorization();

app.MapControllers();

app.Run(); 