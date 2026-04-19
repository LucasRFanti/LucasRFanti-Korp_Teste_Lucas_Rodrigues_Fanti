namespace EstoqueService.Models;

public class CriarProdutoDto
{
    public string Codigo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;
    public int Saldo { get; set; }
}

public class DeduzirSaldoDto
{
    public int Quantidade { get; set; }
}