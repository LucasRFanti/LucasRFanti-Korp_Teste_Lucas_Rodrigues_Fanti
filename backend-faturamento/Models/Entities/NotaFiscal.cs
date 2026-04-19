namespace PortalAdmin.Models.Entities;

public enum StatusNota { Aberta, Fechada }

public class NotaFiscal
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int Numero { get; set; }          
    public StatusNota Status { get; set; } = StatusNota.Aberta;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    public List<ItemNota> Itens { get; set; } = [];
}

public class ItemNota
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid NotaFiscalId { get; set; }
    public Guid ProdutoId { get; set; }
    public string ProdutoCodigo { get; set; } = string.Empty;
    public string ProdutoDescricao { get; set; } = string.Empty;
    public int Quantidade { get; set; }

    public NotaFiscal NotaFiscal { get; set; } = null!;
}