using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using PortalAdmin.Data;
using PortalAdmin.Models;
using PortalAdmin.Models.Entities;
using System.Text.RegularExpressions;
namespace PortalAdmin.Controllers

{
    //localhost:xxxx/api/employess
    [Route("api/[controller]")]
    [ApiController]
    public class EmployessController : ControllerBase
    {
        private readonly ApplicationDbContext dbContext;

        public EmployessController(ApplicationDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        [HttpGet]
        public IActionResult GetAllEmployess()
        {
            return Ok(dbContext.Employees.ToList());
        }

        [HttpGet]
        [Route("{id:guid}")]
        public IActionResult GetEmployeeById(Guid id) 
        {
            var employee = dbContext.Employees.Find(id);

            if (employee is null)
            {
                return NotFound();
            }

            return Ok(employee);
        }

        [HttpPost]
        public IActionResult AddEmployee(AddEmployeeDto addEmployeeDto)
        {
            var phone = NormalizePhone(addEmployeeDto.Phone);
            if (phone is null)
            {
                return BadRequest(new { mensagem = "Telefone inválido. Use DDD + número no padrão brasileiro (ex.: (17) 11111-1111)." });
            }

            var employeeEntity = new Employee()
            {
                Name = addEmployeeDto.Name,
                Email = addEmployeeDto.Email,
                Phone = phone,
                Salary = addEmployeeDto.Salary
            };

            dbContext.Employees.Add(employeeEntity);
            dbContext.SaveChanges();

            return Ok(employeeEntity);
        }

        [HttpPut]
        [Route("{id:guid}")]
        public IActionResult UptadeEmployee(Guid id, UpdateEmployeeDto updateEmployeeDto)
        {
            var employee = dbContext.Employees.Find(id);

            if (employee is null) return NotFound();

            var phone = NormalizePhone(updateEmployeeDto.Phone);
            if (phone is null)
            {
                return BadRequest(new { mensagem = "Telefone inválido. Use DDD + número no padrão brasileiro (ex.: (17) 11111-1111)." });
            }

            employee.Name = updateEmployeeDto.Name;
            employee.Email = updateEmployeeDto.Email;
            employee.Phone = phone;
            employee.Salary = updateEmployeeDto.Salary;

            dbContext.SaveChanges();
            return Ok(employee);
        }

        [HttpDelete]
        [Route("{id:guid}")]
        public IActionResult DeleteEmployee(Guid id)
        {
            var employee = dbContext.Employees.Find(id);
            if (employee is null) return NotFound();

            dbContext.Employees.Remove(employee);
            dbContext.SaveChanges();

            return Ok();
        }

        private static string? NormalizePhone(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return null;

            var digitsOnly = Regex.Replace(input, "\\D", string.Empty);
            if (string.IsNullOrWhiteSpace(digitsOnly)) return null;

            var local = digitsOnly.StartsWith("55") ? digitsOnly[2..] : digitsOnly;

            if (local.Length is not (10 or 11))
            {
                return null;
            }

            var ddd = local[..2];
            var numero = local[2..];

            return numero.Length == 8
                ? $"({ddd}) {numero[..4]}-{numero[4..]}"
                : $"({ddd}) {numero[..5]}-{numero[5..]}";
        }
    }
}
