using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RmsApi.Data;
using RmsApi.DTOs;

namespace RmsApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _db;

        public UsersController(AppDbContext db) => _db = db;

        // GET api/users — list all consultant accounts
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _db.Users
                .Where(u => u.Role == "Consultant")
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new UserListDto
                {
                    Id = u.Id,
                    FullName = u.FullName,
                    Email = u.Email,
                    Role = u.Role,
                    IsActive = u.IsActive,
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.UpdatedAt
                })
                .ToListAsync();

            return Ok(users);
        }

        // GET api/users/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();

            return Ok(new UserListDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            });
        }

        // POST api/users — create a new consultant
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { message = "Full name, email, and password are required." });

            if (request.Password.Length < 6)
                return BadRequest(new { message = "Password must be at least 6 characters." });

            if (await _db.Users.AnyAsync(u => u.Email == request.Email))
                return BadRequest(new { message = "A user with this email already exists." });

            var user = new Models.User
            {
                FullName = request.FullName,
                Email = request.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = "Consultant",
                IsActive = true
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = user.Id }, new { id = user.Id });
        }

        // PUT api/users/{id} — update consultant details
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest request)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();

            // Don't allow editing Admin accounts
            if (user.Role == "Admin")
                return BadRequest(new { message = "Cannot modify admin accounts." });

            if (!string.IsNullOrWhiteSpace(request.FullName))
                user.FullName = request.FullName;

            if (!string.IsNullOrWhiteSpace(request.Email))
            {
                if (await _db.Users.AnyAsync(u => u.Email == request.Email && u.Id != id))
                    return BadRequest(new { message = "A user with this email already exists." });
                user.Email = request.Email;
            }

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                if (request.Password.Length < 6)
                    return BadRequest(new { message = "Password must be at least 6 characters." });
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
            }

            if (request.IsActive.HasValue)
                user.IsActive = request.IsActive.Value;

            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { id = user.Id });
        }

        // DELETE api/users/{id} — delete consultant account
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();

            if (user.Role == "Admin")
                return BadRequest(new { message = "Cannot delete admin accounts." });

            _db.Users.Remove(user);
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}
