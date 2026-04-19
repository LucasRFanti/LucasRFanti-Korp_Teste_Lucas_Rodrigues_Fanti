using Microsoft.EntityFrameworkCore;
using EstoqueService.Models;

namespace EstoqueService.Data;

public class EstoqueDbContext : DbContext
{
    public EstoqueDbContext(DbContextOptions<EstoqueDbContext> options) : base(options) { }
    public DbSet<Produto> Produtos { get; set; }
}