using WebApplication4.DTOs;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using WebApplication4.Services;
using WebApplication4.Helpers;
using NetTopologySuite.IO;
using WebApplication4.Helpers;

namespace WebApplication4.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PointController : ControllerBase
    {
        private readonly MyInterface _service;

        public PointController(MyInterface service)
        {
            _service = service;
        }

        // 1. TÜM NOKTALARI GETİR
        [HttpGet]
        public ActionResult<ResponseDto<List<PointDto>>> GetAllPoints()
        {
            var points = _service.GetAll();

            var dtoList = points.Select(p => new PointDto
            {
                Id = p.Id,
                Name = p.Name,
                WKT = p.Location?.AsText()
            }).ToList();

            return Ok(new ResponseDto<List<PointDto>>
            {
                Mesaj = "Mevcut liste:",
                Data = dtoList
            });
        }


        // 2. TEK BİR NOKTAYI ID İLE GETİR
        [HttpGet("{id}")]
        public ActionResult<ResponseDto<PointDto>> GetById(int id)
        {
            var point = _service.GetById(id);
            if (point == null)
                return NotFound();

            var dto = new PointDto
            {
                Id = point.Id,
                Name = point.Name,
                WKT = point.Location?.AsText() // Geometry’yi WKT’ye çevir
            };

            return Ok(new ResponseDto<PointDto>
            {
                Mesaj = "Kayıt bulundu.",
                Data = dto
            });
        }


        // 3. YENİ NOKTA EKLE

        
        [HttpPost]
        public ActionResult AddPoint(DTO_CreatePoint dto)
        {
            // WKT stringini Geometry'ye dönüştür
            var geometry = GeometryHelper.WktToGeometry(dto.WKT, 4326, 3857); // Örnek: kaynak WGS84, hedef WebMercator

            var point = new Point
            {
                Name = dto.Name,
                Location = geometry
            };

            var added = _service.Add(point);

            return Ok(new
            {
                added.Id,
                added.Name,
                added.Location
            });
        }
        /*
        [HttpPost]
        public ActionResult AddPoint(DTO_CreatePoint dto)
        {
            var geometry = GeometryHelper.WktToGeometry(dto.WKT, 4326, 3857);

            var point = new Point
            {
                Name = dto.Name,
                Location = geometry
            };

            var added = _service.Add(point);

            return Ok(new
            {
                added.Id,
                added.Name,
                added.Location
            });
        }
        */





        [HttpPut("{id}/wkt")]
        public ActionResult<ResponseDto<Point>> UpdateWKT(int id, [FromBody] UpdateWKTDto dto)
        {
            var updatedPoint = _service.UpdateWKT(id, dto.WKT);
            if (updatedPoint == null)
            {
                return NotFound(new ResponseDto<string>
                {
                    Mesaj = "Güncellenecek kayıt bulunamadı.",
                    Data = null
                });
            }

            return Ok(new ResponseDto<Point>
            {
                Mesaj = "WKT başarıyla güncellendi.",
                Data = updatedPoint
            });
        }


        // 5. KAYIT SİL
        [HttpDelete("{id}")]
        public ActionResult<ResponseDto<string>> DeletePoint(int id)
        {
            var deleted = _service.Delete(id);
            if (!deleted)
            {
                return NotFound(new ResponseDto<string>
                {
                    Mesaj = "Kayıt bulunamadı, silinemedi.",
                    Data = null
                });
            }

            return Ok(new ResponseDto<string>
            {
                Mesaj = "Kayıt başarıyla silindi.",
                Data = null
            });
        }

        // 6. TÜM ID'LERİ GETİR (Debug/test için)
        [HttpGet("ids")]
        public ActionResult<ResponseDto<List<int>>> GetAllIds()
        {
            var ids = _service.GetAll().Select(p => p.Id).ToList();
            return Ok(new ResponseDto<List<int>>
            {
                Mesaj = "Kayıtlı ID'ler:",
                Data = ids
            });
        }

       
    }
}



// // http://localhost:5000


