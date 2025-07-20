// veri tabanıyla uygulama arasında köprü kurar.

using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;

namespace WebApplication4
{
    public class AppDbContext : DbContext
    {
        public DbSet<Point> Points { get; set; }

        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Point>()
      .Property(p => p.Location)
      .HasColumnType("geometry")
      .IsRequired(false); 

        }
    }
}
