using Microsoft.EntityFrameworkCore;
using PortalAdmin.Models.Entities;

namespace PortalAdmin.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions options) : base(options) { }

    public DbSet<Employee> Employees { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<NotaFiscal> NotasFiscais { get; set; }
    public DbSet<ItemNota> ItensNota { get; set; }
    public DbSet<IdempotencyRequest> IdempotencyRequests { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Employee>()
            .Property(e => e.Salary)
            .HasPrecision(18, 2);

        modelBuilder.Entity<IdempotencyRequest>()
            .HasIndex(i => new { i.Scope, i.RequestKey })
            .IsUnique();

        modelBuilder.Entity<IdempotencyRequest>()
            .Property(i => i.Scope)
            .HasMaxLength(120)
            .IsRequired();

        modelBuilder.Entity<IdempotencyRequest>()
            .Property(i => i.RequestKey)
            .HasMaxLength(120)
            .IsRequired();
    }
}