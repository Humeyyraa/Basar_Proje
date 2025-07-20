namespace WebApplication4.DTOs
{
    public class DTO_CreatePoint
    {
        public string Name { get; set; }  // Kullanıcıdan gelen isim
        public string WKT { get; set; }   // Kullanıcıdan gelen WKT stringi (örneğin "POINT(30 10)")
    }
}
