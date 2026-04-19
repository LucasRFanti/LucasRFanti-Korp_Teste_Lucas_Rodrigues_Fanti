namespace PortalAdmin.Models.Entities;

public class IdempotencyRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Scope { get; set; } = string.Empty;
    public string RequestKey { get; set; } = string.Empty;
    public Guid NotaFiscalId { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
