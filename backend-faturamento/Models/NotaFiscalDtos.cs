namespace PortalAdmin.Models;

public class CriarNotaDto
{
	public List<ItemNotaDto> Itens { get; set; } = [];
}

public class ItemNotaDto
{
	public Guid ProdutoId { get; set; }
	public string ProdutoCodigo { get; set; } = string.Empty;
	public string ProdutoDescricao { get; set; } = string.Empty;
	public int Quantidade { get; set; }
}