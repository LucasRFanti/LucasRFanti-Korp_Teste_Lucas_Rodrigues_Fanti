using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstoqueService.Data;
using EstoqueService.Models;

namespace EstoqueService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProdutosController : ControllerBase
{
    private readonly EstoqueDbContext _db;
    public ProdutosController(EstoqueDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _db.Produtos.ToListAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var produto = await _db.Produtos.FindAsync(id);
        return produto is null
            ? NotFound(new { mensagem = "Produto não encontrado." })
            : Ok(produto);
    }

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarProdutoDto dto)
    {
        // LINQ — verifica código duplicado
        bool existe = await _db.Produtos.AnyAsync(p => p.Codigo == dto.Codigo);
        if (existe)
            return Conflict(new { mensagem = $"Código '{dto.Codigo}' já cadastrado." });

        var produto = new Produto
        {
            Codigo = dto.Codigo,
            Descricao = dto.Descricao,
            Saldo = dto.Saldo
        };
        _db.Produtos.Add(produto);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = produto.Id }, produto);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Atualizar(Guid id, [FromBody] CriarProdutoDto dto)
    {
        var produto = await _db.Produtos.FindAsync(id);
        if (produto is null) return NotFound(new { mensagem = "Produto não encontrado." });

        bool codigoDuplicado = await _db.Produtos
            .AnyAsync(p => p.Codigo == dto.Codigo && p.Id != id);
        if (codigoDuplicado)
            return Conflict(new { mensagem = $"Código '{dto.Codigo}' já usado por outro produto." });

        produto.Codigo = dto.Codigo;
        produto.Descricao = dto.Descricao;
        produto.Saldo = dto.Saldo;
        await _db.SaveChangesAsync();
        return Ok(produto);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Deletar(Guid id)
    {
        var produto = await _db.Produtos.FindAsync(id);
        if (produto is null) return NotFound(new { mensagem = "Produto não encontrado." });
        _db.Produtos.Remove(produto);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Endpoint chamado internamente pelo Serviço de Faturamento
    [HttpPatch("{id:guid}/deduzir-saldo")]
    public async Task<IActionResult> DeduzirSaldo(Guid id, [FromBody] DeduzirSaldoDto dto)
    {
        if (dto.Quantidade <= 0)
            return BadRequest(new { mensagem = "Quantidade deve ser maior que zero." });

        var linhasAfetadas = await _db.Database.ExecuteSqlInterpolatedAsync($@"
            UPDATE Produtos
               SET Saldo = Saldo - {dto.Quantidade}
             WHERE Id = {id}
               AND Saldo >= {dto.Quantidade}");

        if (linhasAfetadas == 0)
        {
            var existe = await _db.Produtos.AnyAsync(p => p.Id == id);
            if (!existe)
                return NotFound(new { mensagem = "Produto não encontrado." });

            return BadRequest(new { mensagem = "Saldo insuficiente para dedução." });
        }

        var produtoAtualizado = await _db.Produtos.FindAsync(id);
        return Ok(produtoAtualizado);
    }
}