﻿namespace WebApplication4.DTOs
{
    public class PointDto
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string? WKT { get; set; }  // Geometry’yi WKT stringi olarak temsil eder
    }
}
