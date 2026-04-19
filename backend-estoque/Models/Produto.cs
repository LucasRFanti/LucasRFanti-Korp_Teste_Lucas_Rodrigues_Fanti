namespace EstoqueService.Models;

public class Produto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Codigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public int Saldo { get; set; }
}