using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using PortalAdmin.Data;
using PortalAdmin.Models;
using PortalAdmin.Models.Entities;
using System.Collections.Concurrent;

namespace PortalAdmin.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotasFiscaisController : ControllerBase
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _idempotenciaLocks = new();

    private readonly ApplicationDbContext _db;
    private readonly IHttpClientFactory _httpFactory;
    private readonly IConfiguration _config;

    public NotasFiscaisController(
        ApplicationDbContext db,
        IHttpClientFactory httpFactory,
        IConfiguration config)
    {
        _db = db;
        _httpFactory = httpFactory;
        _config = config;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var notas = await _db.NotasFiscais
            .Include(n => n.Itens)
            .OrderByDescending(n => n.Numero)
            .ToListAsync();
        return Ok(notas);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var nota = await _db.NotasFiscais
            .Include(n => n.Itens)
            .FirstOrDefaultAsync(n => n.Id == id);
        return nota is null ? NotFound() : Ok(nota);
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarNotaDto dto)
    {
        var chaveIdempotencia = ObterIdempotencyKey();

        if (!string.IsNullOrWhiteSpace(chaveIdempotencia))
        {
            var scope = "criar-nota";
            var lockKey = $"{scope}:{chaveIdempotencia}";
            var semaphore = _idempotenciaLocks.GetOrAdd(lockKey, _ => new SemaphoreSlim(1, 1));
            await semaphore.WaitAsync();

            try
            {
                var notaExistente = await BuscarNotaPorIdempotenciaAsync(scope, chaveIdempotencia);
                if (notaExistente is not null)
                    return Ok(notaExistente);

                var reservaCriada = await TentarCriarReservaIdempotenciaAsync(scope, chaveIdempotencia);
                if (!reservaCriada)
                {
                    var notaReservada = await AguardarNotaReservadaAsync(scope, chaveIdempotencia);
                    if (notaReservada is not null)
                        return Ok(notaReservada);

                    return Conflict(new { mensagem = "Operação em andamento para esta chave de idempotência. Tente novamente." });
                }

                try
                {
                    var notaCriada = await CriarNovaNotaAsync(dto);
                    await ConfirmarReservaIdempotenciaAsync(scope, chaveIdempotencia, notaCriada.Id);
                    return CreatedAtAction(nameof(GetById), new { id = notaCriada.Id }, notaCriada);
                }
                catch
                {
                    await RemoverReservaIdempotenciaAsync(scope, chaveIdempotencia);
                    throw;
                }
            }
            finally
            {
                semaphore.Release();
            }
        }

        var nota = await CriarNovaNotaAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = nota.Id }, nota);
    }

    private async Task<NotaFiscal> CriarNovaNotaAsync(CriarNotaDto dto)
    {
        int proximoNumero = await _db.NotasFiscais.AnyAsync()
            ? await _db.NotasFiscais.MaxAsync(n => n.Numero) + 1
            : 1;

        var nota = new NotaFiscal
        {
            Numero = proximoNumero,
            Itens = dto.Itens.Select(i => new ItemNota
            {
                ProdutoId = i.ProdutoId,
                ProdutoCodigo = i.ProdutoCodigo,
                ProdutoDescricao = i.ProdutoDescricao,
                Quantidade = i.Quantidade
            }).ToList()
        };

        _db.NotasFiscais.Add(nota);
        await _db.SaveChangesAsync();
        return nota;
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Excluir(Guid id)
    {
        var nota = await _db.NotasFiscais
            .Include(n => n.Itens)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (nota is null)
            return NotFound(new { mensagem = "Nota não encontrada." });

        if (nota.Status == StatusNota.Fechada)
            return Conflict(new { mensagem = "Não é possível excluir uma nota já fechada." });

        _db.NotasFiscais.Remove(nota);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/descartar")]
    public async Task<IActionResult> Descartar(Guid id)
    {
        var nota = await _db.NotasFiscais
            .Include(n => n.Itens)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (nota is null)
            return NotFound(new { mensagem = "Nota não encontrada." });

        if (nota.Status == StatusNota.Fechada)
            return Conflict(new { mensagem = "Não é possível descartar uma nota já fechada." });

        _db.NotasFiscais.Remove(nota);
        await _db.SaveChangesAsync();
        return Ok(new { mensagem = "Nota descartada com sucesso." });
    }

    [HttpDelete("historico")]
    public async Task<IActionResult> LimparHistorico()
    {
        var notasFechadas = await _db.NotasFiscais
            .Where(n => n.Status == StatusNota.Fechada)
            .ToListAsync();

        if (!notasFechadas.Any())
            return Ok(new { mensagem = "Não há notas fechadas para remover.", removidas = 0 });

        _db.NotasFiscais.RemoveRange(notasFechadas);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            mensagem = "Histórico de notas fiscais limpo com sucesso.",
            removidas = notasFechadas.Count
        });
    }

    [HttpPost("{id:guid}/imprimir")]
    public async Task<IActionResult> Imprimir(Guid id)
    {
        var chaveIdempotencia = ObterIdempotencyKey();

        if (!string.IsNullOrWhiteSpace(chaveIdempotencia))
        {
            var scope = $"imprimir-nota:{id}";
            var lockKey = $"{scope}:{chaveIdempotencia}";
            var semaphore = _idempotenciaLocks.GetOrAdd(lockKey, _ => new SemaphoreSlim(1, 1));
            await semaphore.WaitAsync();

            try
            {
                var notaExistente = await BuscarNotaPorIdempotenciaAsync(scope, chaveIdempotencia);
                if (notaExistente is not null)
                    return Ok(notaExistente);

                var reservaCriada = await TentarCriarReservaIdempotenciaAsync(scope, chaveIdempotencia);
                if (!reservaCriada)
                {
                    var notaReservada = await AguardarNotaReservadaAsync(scope, chaveIdempotencia);
                    if (notaReservada is not null)
                        return Ok(notaReservada);

                    return Conflict(new { mensagem = "Operação em andamento para esta chave de idempotência. Tente novamente." });
                }

                try
                {
                    var resultado = await ImprimirNotaInterno(id);
                    if (resultado is OkObjectResult ok && ok.Value is NotaFiscal notaOk)
                    {
                        await ConfirmarReservaIdempotenciaAsync(scope, chaveIdempotencia, notaOk.Id);
                    }
                    else
                    {
                        await RemoverReservaIdempotenciaAsync(scope, chaveIdempotencia);
                    }

                    return resultado;
                }
                catch
                {
                    await RemoverReservaIdempotenciaAsync(scope, chaveIdempotencia);
                    throw;
                }
            }
            finally
            {
                semaphore.Release();
            }
        }

        return await ImprimirNotaInterno(id);
    }

    private async Task<IActionResult> ImprimirNotaInterno(Guid id)
    {
        var nota = await _db.NotasFiscais
            .Include(n => n.Itens)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (nota is null)
            return NotFound(new { mensagem = "Nota não encontrada." });

        if (nota.Status == StatusNota.Fechada)
            return Conflict(new { mensagem = "Nota já está Fechada e não pode ser reimpressa." });

        var client = _httpFactory.CreateClient("EstoqueService");
        var errosNegocio = new List<string>();
        var errosInfra = new List<string>();

        foreach (var item in nota.Itens)
        {
            try
            {
                var resp = await client.PatchAsJsonAsync(
                    $"/api/produtos/{item.ProdutoId}/deduzir-saldo",
                    new { Quantidade = item.Quantidade });

                if (resp.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    var body = await resp.Content.ReadAsStringAsync();
                    errosNegocio.Add($"Produto '{item.ProdutoCodigo}' não encontrado no estoque. {body}");
                }
                else if (resp.StatusCode == System.Net.HttpStatusCode.BadRequest)
                {
                    var body = await resp.Content.ReadAsStringAsync();
                    errosNegocio.Add($"Produto '{item.ProdutoCodigo}': saldo insuficiente. {body}");
                }
                else if (!resp.IsSuccessStatusCode)
                {
                    var body = await resp.Content.ReadAsStringAsync();
                    errosInfra.Add($"Produto '{item.ProdutoCodigo}': erro inesperado. {body}");
                }
            }
            catch (HttpRequestException ex)
            {
                errosInfra.Add($"Serviço de Estoque indisponível ao processar '{item.ProdutoCodigo}': {ex.Message}");
            }
            catch (TaskCanceledException)
            {
                errosInfra.Add($"Timeout ao contatar Serviço de Estoque para '{item.ProdutoCodigo}'.");
            }
        }

        if (errosNegocio.Any())
        {
            return BadRequest(new
            {
                mensagem = "Não foi possível concluir a impressão devido a inconsistências no estoque.",
                erros = errosNegocio
            });
        }

        if (errosInfra.Any())
        {
            return StatusCode(503, new
            {
                mensagem = "Não foi possível concluir a impressão devido a erros no Serviço de Estoque.",
                erros = errosInfra
            });
        }

        nota.Status = StatusNota.Fechada;
        await _db.SaveChangesAsync();
        return Ok(nota);
    }

    private string? ObterIdempotencyKey()
    {
        if (!Request.Headers.TryGetValue("Idempotency-Key", out var valor))
            return null;

        var chave = valor.ToString().Trim();
        return string.IsNullOrWhiteSpace(chave) ? null : chave;
    }

    private async Task<NotaFiscal?> BuscarNotaPorIdempotenciaAsync(string scope, string requestKey)
    {
        var registro = await _db.IdempotencyRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Scope == scope && i.RequestKey == requestKey);

        if (registro is null || registro.NotaFiscalId == Guid.Empty)
            return null;

        return await _db.NotasFiscais
            .Include(n => n.Itens)
            .FirstOrDefaultAsync(n => n.Id == registro.NotaFiscalId);
    }

    private async Task<bool> TentarCriarReservaIdempotenciaAsync(string scope, string requestKey)
    {
        _db.IdempotencyRequests.Add(new IdempotencyRequest
        {
            Scope = scope,
            RequestKey = requestKey,
            NotaFiscalId = Guid.Empty
        });

        try
        {
            await _db.SaveChangesAsync();
            return true;
        }
        catch (DbUpdateException ex) when (EhViolacaoChaveUnica(ex))
        {
            _db.ChangeTracker.Clear();
            return false;
        }
    }

    private async Task ConfirmarReservaIdempotenciaAsync(string scope, string requestKey, Guid notaFiscalId)
    {
        var reserva = await _db.IdempotencyRequests
            .FirstOrDefaultAsync(i => i.Scope == scope && i.RequestKey == requestKey);

        if (reserva is null)
            return;

        reserva.NotaFiscalId = notaFiscalId;
        reserva.CriadoEm = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    private async Task RemoverReservaIdempotenciaAsync(string scope, string requestKey)
    {
        var reserva = await _db.IdempotencyRequests
            .FirstOrDefaultAsync(i => i.Scope == scope && i.RequestKey == requestKey && i.NotaFiscalId == Guid.Empty);

        if (reserva is null)
            return;

        _db.IdempotencyRequests.Remove(reserva);
        await _db.SaveChangesAsync();
    }

    private async Task<NotaFiscal?> AguardarNotaReservadaAsync(string scope, string requestKey)
    {
        for (var tentativa = 0; tentativa < 15; tentativa++)
        {
            var nota = await BuscarNotaPorIdempotenciaAsync(scope, requestKey);
            if (nota is not null)
                return nota;

            await Task.Delay(100);
        }

        return null;
    }

    private static bool EhViolacaoChaveUnica(DbUpdateException ex)
    {
        return ex.InnerException is SqlException sqlEx
               && (sqlEx.Number == 2601 || sqlEx.Number == 2627);
    }
}